// routes/geocode.js
import express from "express";
import { geocodeLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.get("/reverse", geocodeLimiter, async (req, res) => {
  const { lat, lon } = req.query;
  const latitude = Number(lat);
  const longitude = Number(lon);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return res.status(400).json({
      success: false,
      error: "Invalid latitude or longitude"
    });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          'Accept': 'application/json',
            'User-Agent': 'CitiSolve/1.0'
        }
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Geocoding failed" });
  }
});

export default router;