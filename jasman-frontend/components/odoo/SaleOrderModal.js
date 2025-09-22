import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FiX, FiImage, FiAlertCircle, FiCamera, FiSave, FiRotateCw } from 'react-icons/fi';
import styles from '../../styles/Odoo/SaleOrderModal.module.css';

export default function SaleOrderModal({ isOpen, onClose, order }) {
    const { user } = useAuth();
    
    // Estados para imágenes del vehículo
    const [vehicleImages, setVehicleImages] = useState(null);
    const [loadingImages, setLoadingImages] = useState(false);
    const [imageError, setImageError] = useState(null);
    const [activeImage, setActiveImage] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [newImages, setNewImages] = useState({});
    const [expandedImages, setExpandedImages] = useState(false);
    
    // Estados para profundidad de llantas
    const [tireDepth, setTireDepth] = useState({
        front_left: null,
        front_right: null,
        rear_left: null,
        rear_right: null,
        is_loading: false,
        error: null
    });

    const fileInputRef = useRef(null);
    const isMobile = typeof window !== 'undefined' && (window.innerWidth <= 1024 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));

    // Efecto para cargar datos al abrir el modal
    useEffect(() => {
        if (isOpen && order && user?.token) {
            fetchVehicleImages(order.name);
            loadTireDepthData();
        } else {
            setVehicleImages(null);
            setNewImages({});
            resetTireDepthData();
        }
    }, [isOpen, order, user?.token]);

    // Función para cargar imágenes del vehículo
    const fetchVehicleImages = async (orderName) => {
        setLoadingImages(true);
        setImageError(null);
        setVehicleImages(null);
        setNewImages({});
        
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/odoo/vehicle/images/${orderName}`,
                {
                    headers: {
                        'Authorization': `Bearer ${user.token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }
            
            let data = await response.json();
            data = Array.isArray(data) ? data[0] : data;
            
            const processedImages = {};
            const imageFields = [
                'vehicle_front', 
                'vehicle_back', 
                'vehicle_left', 
                'vehicle_right', 
                'vehicle_trunk', 
                'vehicle_dashboard'
            ];
            
            imageFields.forEach(field => {
                if (data && data[field]) {
                    processedImages[field] = data[field].startsWith('data:image') 
                        ? data[field] 
                        : `data:image/jpeg;base64,${data[field]}`;
                }
            });
            
            setVehicleImages(processedImages);
        } catch (err) {
            console.error('Error:', err);
            setImageError('No se pudieron cargar las imágenes');
        } finally {
            setLoadingImages(false);
        }
    };

    // Función para cargar datos de profundidad existentes
    const loadTireDepthData = () => {
        if (order?.tire_depth) {
            setTireDepth({
                front_left: order.tire_depth.front_left_depth,
                front_right: order.tire_depth.front_right_depth,
                rear_left: order.tire_depth.rear_left_depth,
                rear_right: order.tire_depth.rear_right_depth,
                is_loading: false,
                error: null
            });
        }
    };

    // Función para resetear datos de profundidad
    const resetTireDepthData = () => {
        setTireDepth({
            front_left: null,
            front_right: null,
            rear_left: null,
            rear_right: null,
            is_loading: false,
            error: null
        });
    };

    // Handler para cambios en los valores de profundidad
    const handleTireDepthChange = (position, value) => {
        const numValue = parseFloat(value);
        setTireDepth(prev => ({
            ...prev,
            [position]: isNaN(numValue) ? null : numValue
        }));
    };

    // Función para guardar datos de profundidad
    const saveTireDepth = async () => {
        if (!order) return;
        
        setTireDepth(prev => ({ ...prev, is_loading: true, error: null }));

        try {
            const payload = {
                sale_order_id: order.id,
                sale_order_name: order.name,
                sucursal_id: order.sucursal_id || order.ceco_analytic_account_id?.[0],
                front_left_depth: tireDepth.front_left,
                front_right_depth: tireDepth.front_right,
                rear_left_depth: tireDepth.rear_left,
                rear_right_depth: tireDepth.rear_right
            };

            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/odoo/tire_depth`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const updatedData = await response.json();
            setTireDepth(prev => ({
                ...prev,
                front_left: updatedData.data.front_left_depth,
                front_right: updatedData.data.front_right_depth,
                rear_left: updatedData.data.rear_left_depth,
                rear_right: updatedData.data.rear_right_depth,
                is_loading: false
            }));

        } catch (err) {
            console.error('Error al guardar profundidad:', err);
            setTireDepth(prev => ({
                ...prev,
                error: err.message || 'Error al guardar los datos',
                is_loading: false
            }));
        }
    };

    // Función para formatear moneda
    const formatCurrency = (value) => 
        new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value || 0);

    // Función para subir imágenes
    const handleImageUpload = async () => {
        if (!order || !user?.token || Object.keys(newImages).length === 0) return;

        setUploading(true);
        setUploadProgress(0);
        
        try {
            const imagesPayload = {};
            
            for (const [key, file] of Object.entries(newImages)) {
                const base64 = await convertToBase64(file);
                imagesPayload[key] = base64;
                setUploadProgress(prev => prev + (100 / Object.keys(newImages).length / 2));
            }
            
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/odoo/vehicle/images/upload/${order.name}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${user.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(imagesPayload)
                }
            );

            if (!response.ok) {
                throw new Error(`Error ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                const updatedImages = { ...vehicleImages };
                Object.keys(newImages).forEach(key => {
                    if (newImages[key]) {
                        updatedImages[key] = URL.createObjectURL(newImages[key]);
                    }
                });
                
                setVehicleImages(updatedImages);
                setNewImages({});
                setUploadProgress(100);
                setTimeout(() => setUploadProgress(0), 1000);
            } else {
                throw new Error('Error al subir las imágenes');
            }
        } catch (err) {
            console.error('Error al subir imágenes:', err);
            setImageError('Error al subir las imágenes');
        } finally {
            setUploading(false);
        }
    };

    // Función para convertir imágenes a base64
    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    // Función para verificar soporte de cámara
    const checkCameraSupport = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop());
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length === 0) {
                return { hasFrontCamera: false, hasBackCamera: false };
            }
            
            if (videoDevices.length === 1) {
                return { hasFrontCamera: false, hasBackCamera: true };
            }
            
            const hasFrontCamera = videoDevices.some(device => {
                return device.label.toLowerCase().includes('front') || 
                       device.label.toLowerCase().includes('user') ||
                       device.label.toLowerCase().includes('facing');
            });
            
            const hasBackCamera = videoDevices.some(device => {
                return device.label.toLowerCase().includes('back') || 
                       device.label.toLowerCase().includes('environment') ||
                       device.label.toLowerCase().includes('rear');
            });
            
            return { 
                hasFrontCamera: hasFrontCamera || videoDevices.length > 1, 
                hasBackCamera: hasBackCamera || videoDevices.length > 1 
            };
        } catch (err) {
            console.error('Error al verificar cámaras:', err);
            return { hasFrontCamera: true, hasBackCamera: true };
        }
    };

    // Función para abrir cámara
    const openCamera = async (imageKey, initialFacing = 'user') => {
        let currentStream = null;
        let currentFacing = initialFacing;
    
        const startCamera = async (facingMode = 'user') => {
            if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
    
            const constraints = {
                video: {
                    facingMode: { exact: facingMode },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
    
            try {
                currentStream = await navigator.mediaDevices.getUserMedia(constraints);
                return currentStream;
            } catch (error) {
                console.warn('Fallo con facingMode exact, probando sin exact:', error);
                
                try {
                    currentStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: facingMode,
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        }
                    });
                    return currentStream;
                } catch (secondError) {
                    console.error('Error al iniciar cámara:', secondError);
                    
                    try {
                        currentStream = await navigator.mediaDevices.getUserMedia({
                            video: true
                        });
                        return currentStream;
                    } catch (finalError) {
                        console.error('Error final al iniciar cámara:', finalError);
                        throw finalError;
                    }
                }
            }
        };
    
        const createCameraUI = () => {
            const container = document.createElement('div');
            container.className = styles.cameraContainer;
    
            const video = document.createElement('video');
            video.className = styles.cameraVideo;
            video.autoplay = true;
            video.muted = true;
            video.playsInline = true;
            video.setAttribute('playsinline', 'true');
            video.srcObject = currentStream;
    
            video.onerror = () => {
                console.error('Error en el elemento de video');
                alert('Error al mostrar la cámara. Intenta con otro navegador.');
                document.body.removeChild(container);
                if (currentStream) {
                    currentStream.getTracks().forEach(track => track.stop());
                }
            };
    
            const checkVideoPlaying = setInterval(() => {
                if (video.readyState >= video.HAVE_ENOUGH_DATA) {
                    if (video.videoWidth === 0 || video.videoHeight === 0) {
                        console.warn('El video se está reproduciendo pero no muestra imagen');
                        video.srcObject = null;
                        setTimeout(() => {
                            video.srcObject = currentStream;
                        }, 100);
                    }
                    clearInterval(checkVideoPlaying);
                }
            }, 100);
    
            const captureBtn = document.createElement('button');
            captureBtn.textContent = 'Capturar';
            captureBtn.className = styles.cameraActionButton;
            captureBtn.onclick = async () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0);
                    
                    canvas.toBlob(blob => {
                        if (blob) {
                            handleNewImage(imageKey, new File([blob], `${imageKey}.jpg`, { type: 'image/jpeg' }));
                        } else {
                            throw new Error('No se pudo capturar la imagen');
                        }
                        document.body.removeChild(container);
                        currentStream.getTracks().forEach(track => track.stop());
                    }, 'image/jpeg', 0.85);
                } catch (error) {
                    console.error('Error al capturar imagen:', error);
                    alert('Error al capturar la imagen. Intenta de nuevo.');
                }
            };
    
            const switchBtn = document.createElement('button');
            switchBtn.textContent = 'Cambiar Cámara';
            switchBtn.className = `${styles.cameraActionButton} ${styles.secondary}`;
            switchBtn.onclick = async () => {
                currentFacing = currentFacing === 'user' ? 'environment' : 'user';
                try {
                    await startCamera(currentFacing);
                    video.srcObject = currentStream;
                } catch (error) {
                    console.error('Error al cambiar cámara:', error);
                    alert('No se pudo cambiar a la otra cámara. Intenta de nuevo.');
                }
            };
    
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancelar';
            cancelBtn.className = `${styles.cameraActionButton} ${styles.danger}`;
            cancelBtn.onclick = () => {
                document.body.removeChild(container);
                currentStream.getTracks().forEach(track => track.stop());
            };
    
            const buttonContainer = document.createElement('div');
            buttonContainer.className = styles.cameraButtonContainer;
            buttonContainer.appendChild(captureBtn);
            buttonContainer.appendChild(switchBtn);
            buttonContainer.appendChild(cancelBtn);
    
            container.appendChild(video);
            container.appendChild(buttonContainer);
            document.body.appendChild(container);
        };
    
        try {
            await startCamera(currentFacing);
            createCameraUI();
        } catch (error) {
            console.error('Error inicializando cámara:', error);
            alert('No se pudo acceder a la cámara. Verifica los permisos y prueba otro navegador.');
            fileInputRef.current.name = imageKey;
            fileInputRef.current.click();
        }
    };

    // Función para mostrar menú de selección de cámara/galería
    const showCameraMenu = async (imageKey) => {
        const { hasFrontCamera, hasBackCamera } = await checkCameraSupport();
        
        const menuContainer = document.createElement('div');
        menuContainer.className = styles.cameraMenuContainer;

        const menuContent = document.createElement('div');
        menuContent.className = styles.cameraMenuContent;

        const title = document.createElement('h3');
        title.textContent = 'Seleccionar origen de la imagen';
        title.className = styles.cameraMenuTitle;

        menuContent.appendChild(title);

        if (isMobile) {
            if (hasBackCamera) {
                const backCameraBtn = createMenuButton('Usar Cámara Trasera', 'primary', () => {
                    document.body.removeChild(menuContainer);
                    openCamera(imageKey, 'environment');
                });
                menuContent.appendChild(backCameraBtn);
            }
            
            if (hasFrontCamera) {
                const frontCameraBtn = createMenuButton('Usar Cámara Frontal', 'primary', () => {
                    document.body.removeChild(menuContainer);
                    openCamera(imageKey, 'user');
                });
                menuContent.appendChild(frontCameraBtn);
            }
            
            if (!hasFrontCamera && !hasBackCamera) {
                const noCameraMsg = document.createElement('p');
                noCameraMsg.textContent = 'No se detectaron cámaras disponibles';
                noCameraMsg.className = styles.cameraMenuMessage;
                menuContent.appendChild(noCameraMsg);
            }
        } else {
            const cameraBtn = createMenuButton('Usar Cámara', 'primary', () => {
                document.body.removeChild(menuContainer);
                openCamera(imageKey, 'user');
            });
            menuContent.appendChild(cameraBtn);
        }

        const galleryBtn = createMenuButton('Seleccionar de Galería', 'secondary', () => {
            document.body.removeChild(menuContainer);
            fileInputRef.current.name = imageKey;
            fileInputRef.current.click();
        });
        menuContent.appendChild(galleryBtn);

        const cancelBtn = createMenuButton('Cancelar', 'danger', () => {
            document.body.removeChild(menuContainer);
        });
        menuContent.appendChild(cancelBtn);

        menuContainer.appendChild(menuContent);
        document.body.appendChild(menuContainer);
    };

    // Función auxiliar para crear botones del menú
    const createMenuButton = (text, variant, onClick) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = `${styles.cameraMenuButton} ${styles[variant]}`;
        button.onclick = onClick;
        return button;
    };

    // Handler para selección de archivos
    const handleFileSelect = (e) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            handleNewImage(name, files[0]);
        }
    };

    // Función para manejar nueva imagen
    const handleNewImage = (imageKey, file) => {
        setNewImages(prev => ({
            ...prev,
            [imageKey]: file
        }));
    };

    // Función para disparar el input de imagen
    const triggerImageInput = (imageKey) => {
        showCameraMenu(imageKey);
    };

    // Función para obtener la fuente de la imagen
    const getImageSource = (key) => {
        if (newImages[key]) {
            return URL.createObjectURL(newImages[key]);
        }
        return vehicleImages?.[key] || null;
    };

    // Función para alternar sección de imágenes
    const toggleImagesSection = () => {
        setExpandedImages(!expandedImages);
    };

    // Verificar si hay cambios en imágenes
    const hasImageChanges = Object.keys(newImages).length > 0;
    
    // Verificar si hay cambios en profundidad
    const hasDepthChanges = (
        tireDepth.front_left !== (order?.tire_depth?.front_left_depth ?? null) ||
        tireDepth.front_right !== (order?.tire_depth?.front_right_depth ?? null) ||
        tireDepth.rear_left !== (order?.tire_depth?.rear_left_depth ?? null) ||
        tireDepth.rear_right !== (order?.tire_depth?.rear_right_depth ?? null)
    );

    // Parsear información del vehículo
    const parseVehicle = (vehicleStr) => {
        if (!vehicleStr || vehicleStr.toLowerCase().includes("sin vehículo")) {
            return { marca: 'Sin vehículo', modelo: '', placas: '' };
        }
        const parts = vehicleStr.split('/');
        const placas = parts.pop();
        const modelo = parts.pop();
        const marca = parts.join('/');
        return { marca, modelo, placas };
    };

    if (!isOpen || !order) return null;

    const dateObj = new Date(order.date_order);
    const fecha = dateObj.toLocaleDateString('es-MX');
    const hora = dateObj.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const { marca, modelo, placas } = parseVehicle(order.vehicle_id?.[1] || 'Sin vehículo');
    
    const imageTitles = {
        vehicle_front: `Vista Frontal "${placas}"`,
        vehicle_back: `Vista Trasera "${placas}"`,
        vehicle_left: 'Lateral Izquierdo',
        vehicle_right: 'Lateral Derecho',
        vehicle_trunk: 'Cajuela',
        vehicle_dashboard: 'Tablero'
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
                {/* Encabezado del Modal */}
                <div className={styles.modalHeader}>
                    <div>
                        <h2 className={styles.orderTitle}>Orden {order.name}</h2>
                        <h2 className={styles.orderPlaca}>{placas || 'Sin placas'}</h2>
                        <p className={styles.orderDate}>{fecha} a las {hora}</p>
                    </div>
                    <div className={styles.headerActions}>
                        {(hasImageChanges || hasDepthChanges) && (
                            <button 
                                onClick={() => {
                                    if (hasImageChanges) handleImageUpload();
                                    if (hasDepthChanges) saveTireDepth();
                                }}
                                disabled={uploading || tireDepth.is_loading}
                                className={styles.saveButton}
                            >
                                {(uploading || tireDepth.is_loading) ? (
                                    <FiRotateCw className={styles.spinner} size={20} />
                                ) : (
                                    <FiSave className={styles.whiteIcon} size={20} />
                                )}
                                <span>Guardar cambios</span>
                            </button>
                        )}
                        <button onClick={onClose} className={styles.closeButton}>
                            <FiX className={styles.whiteIcon} size={24} />
                        </button>
                    </div>
                </div>
    
                {/* Contenido Principal */}
                <div className={styles.modalContent}>
                    {/* Sección de Detalles de la Orden */}
                    <div className={styles.detailsSection}>
                        <h3 className={styles.sectionTitle}>
                            <span className={styles.titleDecorator}></span>
                            Detalles de la Orden
                        </h3>
                        
                        <div className={styles.tableContainer}>
                            <table className={styles.orderTable}>
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Descripción</th>
                                        <th>Cantidad</th>
                                        <th>Precio</th>
                                        <th>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.order_lines?.length > 0 ? (
                                        order.order_lines.map((line, index) => (
                                            <tr key={index}>
                                                <td>{line.product}</td>
                                                <td>{line.description}</td>
                                                <td>{line.quantity}</td>
                                                <td>{formatCurrency(line.unit_price)}</td>
                                                <td>{formatCurrency(line.subtotal)}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className={styles.noData}>
                                                No hay líneas registradas
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
    
                        <div className={styles.summaryContainer}>
                            <div className={styles.summaryRow}>
                                <span>Subtotal:</span>
                                <span>{formatCurrency(order.amount_untaxed)}</span>
                            </div>
                            <div className={styles.summaryRow}>
                                <span>Impuestos:</span>
                                <span>{formatCurrency(order.amount_tax)}</span>
                            </div>
                            <div className={styles.summaryTotal}>
                                <span>Total:</span>
                                <span>{formatCurrency(order.amount_total)}</span>
                            </div>
                        </div>
                    </div>
    
                    {/* Sección de Profundidad de Llantas (NUEVA) */}
                    <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                            <span className={styles.titleDecorator}></span>
                            Profundidad de Llantas (mm)
                        </h3>
    
                        {tireDepth.error && (
                            <div className={styles.errorMessage}>
                                <FiAlertCircle /> {tireDepth.error}
                            </div>
                        )}
    
                        <div className={styles.tireDepthGrid}>
                            {[
                                { label: "Delantera Izquierda", key: "front_left" },
                                { label: "Delantera Derecha", key: "front_right" },
                                { label: "Trasera Izquierda", key: "rear_left" },
                                { label: "Trasera Derecha", key: "rear_right" }
                            ].map((tire) => (
                                <div key={tire.key} className={styles.tireInput}>
                                    <label>{tire.label}</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="20"
                                        value={tireDepth[tire.key] ?? ''}
                                        onChange={(e) => handleTireDepthChange(tire.key, e.target.value)}
                                        disabled={tireDepth.is_loading}
                                        placeholder="0.0"
                                    />
                                    {tireDepth[tire.key] !== null && (
                                        <div className={styles.depthIndicator}>
                                            <div 
                                                className={`${styles.depthBar} ${
                                                    tireDepth[tire.key] > 5 ? styles.safe :
                                                    tireDepth[tire.key] >= 2.1 ? styles.warning :
                                                    styles.danger
                                                }`}
                                                style={{ width: `${Math.min(100, (tireDepth[tire.key] || 0) * 20)}%` }}
                                                ></div>
                                            <span>{tireDepth[tire.key]} mm</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
    
                        
                    </div>
    
                    {/* Sección de Imágenes del Vehículo */}
                    <div className={styles.imagesSection}>
                        <h3 
                            className={styles.sectionTitle} 
                            onClick={toggleImagesSection}
                            style={{ cursor: 'pointer' }}
                        >
                            <span className={styles.titleDecorator}></span>
                            Imágenes del Vehículo
                            {expandedImages ? '▼' : '►'}
                        </h3>
    
                        {expandedImages && (
                            <>
                                {uploading && (
                                    <div className={styles.uploadProgress}>
                                        <div 
                                            className={styles.progressBar}
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                        <span>{Math.round(uploadProgress)}% completado</span>
                                    </div>
                                )}
    
                                {loadingImages && (
                                    <div className={styles.loadingState}>
                                        <div className={styles.spinner}></div>
                                        <p>Cargando imágenes...</p>
                                    </div>
                                )}
    
                                {imageError && (
                                    <div className={styles.errorState}>
                                        <FiAlertCircle className={styles.whiteIcon} size={24} />
                                        <p>{imageError}</p>
                                    </div>
                                )}
    
                                <div className={styles.imageGallery}>
                                    {Object.keys(imageTitles).map((key) => {
                                        const imageSrc = getImageSource(key);
                                        
                                        return (
                                            <div 
                                                key={key} 
                                                className={`${styles.imageThumbnail} ${activeImage === key ? styles.active : ''}`}
                                                onClick={() => imageSrc && setActiveImage(key)}
                                            >
                                                <div className={styles.imageWrapper}>
                                                    {imageSrc ? (
                                                        <img
                                                            src={imageSrc}
                                                            alt={imageTitles[key]}
                                                            onError={(e) => {
                                                                e.target.style.display = 'none';
                                                                e.target.nextElementSibling.style.display = 'flex';
                                                            }}
                                                        />
                                                    ) : (
                                                        <div 
                                                            className={styles.uploadPlaceholder}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                triggerImageInput(key);
                                                            }}
                                                        >
                                                            <FiCamera className={styles.whiteIcon} size={32} />
                                                            <span>Agregar imagen</span>
                                                        </div>
                                                    )}
                                                    <div className={styles.imageFallback}>
                                                        <FiImage className={styles.whiteIcon} size={32} />
                                                        <span>Imagen no disponible</span>
                                                    </div>
                                                </div>
                                                <p>{imageTitles[key]}</p>
                                                {newImages[key] && (
                                                    <div className={styles.uploadBadge}>
                                                        <span>Nueva</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
    
                                {activeImage && getImageSource(activeImage) && (
                                    <div className={styles.imagePreviewOverlay} onClick={() => setActiveImage(null)}>
                                        <div className={styles.imagePreviewContent} onClick={e => e.stopPropagation()}>
                                            <button 
                                                className={styles.closePreviewButton}
                                                onClick={() => setActiveImage(null)}
                                            >
                                                <FiX className={styles.whiteIcon} size={24} />
                                            </button>
                                            <img 
                                                src={getImageSource(activeImage)} 
                                                alt={imageTitles[activeImage]} 
                                                className={styles.previewImage}
                                            />
                                            <p className={styles.previewCaption}>{imageTitles[activeImage]}</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
    
                {/* Input oculto para selección de archivos */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    style={{ display: 'none' }}
                />
            </div>
        </div>
    );
}