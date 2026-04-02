export default function handler(req, res) {
  res.status(200).json({
    status: "ok",
    service: "collect-engine",
    timestamp: new Date().toISOString()
  });
}
