import Banner from "../models/HomeBanner.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

// 🟢 CREATE BANNER
const createBanner = asyncHandler(async (req, res) => {
  try {
    const { title, bannerImage, isActive } = req.body;

    // Required validations
    if (!title || title.trim() === "") {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Banner title is required"));
    }

    if (!bannerImage || bannerImage.trim() === "") {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Banner image is required"));
    }

    const banner = await Banner.create({
      title: title.trim(),
      bannerImage,
      isActive: isActive !== undefined ? isActive : true,
    });

    res
      .status(201)
      .json(new apiResponse(201, banner, "Banner created successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🟡 GET ALL BANNERS
const getAllBanners = asyncHandler(async (req, res) => {
  try {
    const {
      isPagination = "true",
      page = 1,
      limit = 10,
      search,
      sortBy = "recent",
      isActive,
    } = req.query;

    const match = {};
    if (isActive !== undefined) match.isActive = isActive === "true";

    let pipeline = [{ $match: match }];

    // Search by title
    if (search) {
      const regex = new RegExp(search.trim(), "i");
      pipeline.push({ $match: { title: { $regex: regex } } });
    }

    // Sorting
    if (sortBy === "recent") {
      pipeline.push({ $sort: { createdAt: -1, _id: -1 } });
    } else if (sortBy === "oldest") {
      pipeline.push({ $sort: { createdAt: 1, _id: 1 } });
    }

    // Get total count
    const totalArr = await Banner.aggregate([...pipeline, { $count: "count" }]);
    const total = totalArr[0]?.count || 0;

    // Pagination
    if (isPagination === "true") {
      pipeline.push(
        { $skip: (page - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
      );
    }

    const banners = await Banner.aggregate(pipeline);

    res.status(200).json(
      new apiResponse(
        200,
        {
          banners,
          totalBanners: total,
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
        },
        "Banners fetched successfully"
      )
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🔵 GET SINGLE BANNER
const getBannerById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid banner ID"));
    }

    const banner = await Banner.findById(id);

    if (!banner) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Banner not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, banner, "Banner fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🟠 UPDATE BANNER
const updateBanner = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid banner ID"));
    }

    const banner = await Banner.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!banner) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Banner not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, banner, "Banner updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🔴 DELETE BANNER
const deleteBanner = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid banner ID"));
    }

    const banner = await Banner.findByIdAndDelete(id);

    if (!banner) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Banner not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, banner, "Banner deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createBanner,
  getAllBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
};
