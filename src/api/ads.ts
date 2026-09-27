import express from "express";
import { adsRepository } from '../repositories/adsRepository.js';

const adsRouter = express.Router();

adsRouter.post("/create", (req, res) => {
  const { ownerType, ownerId, title, imageUrl, linkTo, placement, startDate, endDate, planId } = req.body;

  if (!ownerType || !ownerId || !title || !imageUrl) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const newAd = adsRepository.createAd({
    ownerType,
    ownerId,
    title,
    imageUrl,
    linkTo: linkTo || "",
    placement: placement || "home_banner",
    startDate: startDate || new Date().toISOString(),
    endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    planId: planId || "ad_plan_basic"
  });

  // Note: The ad is created with "pending_review" status.
  // In a real app, successful payment would trigger an update to "active" or an admin would review it.

  res.json({ message: "Ad request submitted successfully. Pending review/payment.", ad: newAd });
});

adsRouter.get("/list", (req, res) => {
  const placement = req.query.placement as string | undefined;
  let ads = adsRepository.getAds(placement);
  
  // Filter by date
  const now = new Date();
  ads = ads.filter(ad => {
    return new Date(ad.startDate) <= now && new Date(ad.endDate) >= now;
  });

  res.json({ ads });
});

export default adsRouter;
