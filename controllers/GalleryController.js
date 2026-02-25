import Gallery from "../models/Gallery.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

// 🟢 CREATE GALLERY ITEM
const createGallery = asyncHandler(async (req, res) => {
  try {
    const { title, url, isActive } = req.body;

    if (!url || url.trim() === "") {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Image URL is required"));
    }

    const gallery = await Gallery.create({
      title: title?.trim() || "",
      url: url.trim(),
      isActive: isActive !== undefined ? isActive : true,
    });

    res
      .status(201)
      .json(new apiResponse(201, gallery, "Gallery item created successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🟡 GET ALL GALLERY ITEMS (with pagination + search)
const getAllGallery = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      isActive,
      sortBy = "recent",
    } = req.query;

    const match = {};
    if (isActive !== undefined) match.isActive = isActive === "true";

    let pipeline = [{ $match: match }];

    // 🔎 Search filter
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      pipeline.push({ $match: { title: { $regex: regex } } });
    }

    // 🧭 Sorting
    if (sortBy === "recent") {
      pipeline.push({ $sort: { createdAt: -1, _id: -1 } });
    } else if (sortBy === "oldest") {
      pipeline.push({ $sort: { createdAt: 1, _id: 1 } });
    } else {
      pipeline.push({ $sort: { _id: -1 } });
    }

    // Count total
    const totalArr = await Gallery.aggregate([...pipeline, { $count: "count" }]);
    const total = totalArr[0]?.count || 0;

    // Pagination
    if (isPagination === "true") {
      pipeline.push(
        { $skip: (page - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
      );
    }

    const gallery = await Gallery.aggregate(pipeline);

    res.status(200).json(
      new apiResponse(
        200,
        {
          gallery,
          totalGallery: total,
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
        },
        "Gallery items fetched successfully"
      )
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🔵 GET SINGLE GALLERY ITEM
const getGalleryById = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid gallery ID"));
    }

    const gallery = await Gallery.findById(req.params.id);

    if (!gallery) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Gallery item not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, gallery, "Gallery item fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🟠 UPDATE GALLERY ITEM
const updateGallery = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid gallery ID"));
    }

    const updatedGallery = await Gallery.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedGallery) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Gallery item not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, updatedGallery, "Gallery updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🔴 DELETE GALLERY ITEM
const deleteGallery = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid gallery ID"));
    }

    const deletedGallery = await Gallery.findByIdAndDelete(req.params.id);

    if (!deletedGallery) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Gallery item not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, deletedGallery, "Gallery deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createGallery,
  getAllGallery,
  getGalleryById,
  updateGallery,
  deleteGallery,
};
