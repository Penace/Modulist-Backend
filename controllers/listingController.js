import mongoose from "mongoose";
import Listing from "../models/Listing.js";

// GET all listings
export const getAllListings = async (req, res) => {
  try {
    const query = {};
    if (req.query.tag) {
      query.tag = req.query.tag;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    const listings = await Listing.find(query);
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching listings", error });
  }
};

// GET listing by ID
export const getListingById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid listing ID format" });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: "Listing not found" });
    res.status(200).json(listing);
  } catch (error) {
    res.status(500).json({ message: "Error fetching listing", error });
  }
};

// POST new listing
export const createListing = async (req, res) => {
  console.log("Creating listing with data:", req.body);
  try {
    const data = { ...req.body };
    if (!data.status) data.status = "draft";
    if (req.user && req.user._id) {
      data.createdBy = req.user._id;
    }
    if (data.images && Array.isArray(data.images)) {
      data.images = data.images.map((img) =>
        typeof img === "string" ? img.replace(/([^:]\/)\/+/g, "$1") : img
      );
    }
    // Clean draft fields if status is draft
    if (data.status === "draft") {
      const cleanDraftFields = [
        "location",
        "price",
        "description",
        "images",
        "address",
        "bedrooms",
        "bathrooms",
        "squareFootage",
        "propertyType",
        "yearBuilt",
        "parkingAvailable",
        "listingType",
        "availableFrom",
        "features",
        "amenities",
        "facilities",
        "slug",
      ];

      cleanDraftFields.forEach((field) => {
        if (
          data[field] === "" ||
          data[field] === undefined ||
          data[field] === null ||
          (Array.isArray(data[field]) && data[field].length === 0)
        ) {
          delete data[field];
        }
      });
    }
    console.log("Final listing data before save:", data);
    const newListing = new Listing(data);
    const validationError = newListing.validateSync();
    if (data.status !== "draft" && validationError) {
      return res
        .status(400)
        .json({ message: "Validation failed", error: validationError });
    }
    const savedListing = await newListing.save();
    res.status(201).json(savedListing);
  } catch (error) {
    res.status(400).json({ message: "Error creating listing", error });
  }
};

// PATCH update listing
export const updateListing = async (req, res) => {
  console.log("Updating listing ID:", req.params.id);
  if (req.body.images && Array.isArray(req.body.images)) {
    req.body.images = req.body.images.map((img) =>
      typeof img === "string" ? img.replace(/([^:]\/)\/+/g, "$1") : img
    );
  }
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid listing ID format" });
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedListing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.status(200).json(updatedListing);
  } catch (error) {
    res.status(500).json({ message: "Error updating listing", error });
  }
};

// DELETE listing
export const deleteListing = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid listing ID format" });
    }

    const deletedListing = await Listing.findByIdAndDelete(req.params.id);

    if (!deletedListing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.status(200).json({ message: "Listing deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting listing", error });
  }
};

// GET listings by status (optional) and userId (required)
export const getListingsByStatus = async (req, res) => {
  try {
    const status = req.params.status;
    const userId = req.query.userId;

    if (!userId) {
      return res
        .status(400)
        .json({ message: "Missing userId query parameter" });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid userId format" });
    }

    const query = { createdBy: new mongoose.Types.ObjectId(userId) };
    if (status) {
      query.status = status;
    }

    const listings = await Listing.find(query);
    res.status(200).json(listings);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching listings by status", error });
  }
};

// PATCH approve listing by ID
export const approveListing = async (req, res) => {
  try {
    const listingId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ message: "Invalid listing ID format" });
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      listingId,
      { status: "approved" },
      { new: true }
    );

    if (!updatedListing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.status(200).json(updatedListing);
  } catch (error) {
    res.status(500).json({ message: "Error approving listing", error });
  }
};

// PATCH reject listing by ID
export const rejectListing = async (req, res) => {
  try {
    const listingId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return res.status(400).json({ message: "Invalid listing ID format" });
    }

    const updatedListing = await Listing.findByIdAndUpdate(
      listingId,
      { status: "rejected" },
      { new: true }
    );

    if (!updatedListing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    res.status(200).json(updatedListing);
  } catch (error) {
    res.status(500).json({ message: "Error rejecting listing", error });
  }
};

// GET check for duplicate draft by slug, title, or address and createdBy
export const checkDuplicateDraft = async (req, res) => {
  const { title, slug, address, createdBy, listingId } = req.body;

  const query = {
    status: "draft",
    createdBy,
    $or: [
      { title: title.trim() },
      { slug: slug.trim() },
      { address: address.trim() },
    ],
  };

  if (listingId) {
    query._id = { $ne: listingId }; // Exclude current draft
  }

  const exists = await Listing.exists(query);
  res.json({ exists: Boolean(exists) });
};
