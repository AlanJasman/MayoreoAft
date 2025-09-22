import jwt from "jsonwebtoken";

export default function handler(req, res) {
  const METABASE_SITE_URL = process.env.METABASE_SITE_URL;
  const METABASE_SECRET_KEY = process.env.METABASE_SECRET_KEY;
  const DASHBOARD_ID = parseInt(process.env.METABASE_DASHBOARD_ID);

  const payload = {
    resource: { dashboard: DASHBOARD_ID },
    params: {},
    exp: Math.round(Date.now() / 1000) + 10 * 60,
  };

  try {
    const token = jwt.sign(payload, METABASE_SECRET_KEY);
    const iframeUrl = `${METABASE_SITE_URL}/embed/dashboard/${token}#bordered=true&titled=true`;
    res.status(200).json({ iframeUrl });
  } catch (err) {
    res.status(500).json({ error: 'Token generation failed' });
  }
}
