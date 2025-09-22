export default function LoadingWheel() {
    return (
      <div className="image-loader">
        <img src="/img/tire.png" alt="Cargando..." className="spinning-image" />
        <div className="road-line" />
  
        <style jsx>{`
          .image-loader {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 140px;
            margin: 30px auto;
            position: relative;
          }
  
          .spinning-image {
            width: 80px;
            height: 80px;
            animation: spin 1s linear infinite;
          }
  
          .road-line {
            width: 120px;
            height: 6px;
            background-color: #3c3c3c;
            border-radius: 10px;
            margin-top: 10px;
            animation: move-road 2s linear infinite;
          }
  
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
  
          @keyframes move-road {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }
        `}</style>
      </div>
    );
  }
  