import Category from "../models/category.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

// 🟢 CREATE CATEGORY
const createCategory = asyncHandler(async (req, res) => {
  try {
    const { name, image, isActive } = req.body;

    // ✅ Basic validations
    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Category name is required"));
    }

    // Optional: Check if category name already exists
    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Category with this name already exists"));
    }

    const category = await Category.create({
      name: name.trim(),
      image: image || null,
      isActive: isActive !== undefined ? isActive : true,
    });

    res
      .status(201)
      .json(new apiResponse(201, category, "Category created successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🟡 GET ALL CATEGORIES (with pagination + search)
const getAllCategories = asyncHandler(async (req, res) => {
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
      pipeline.push({ $match: { name: { $regex: regex } } });
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
    const totalArr = await Category.aggregate([...pipeline, { $count: "count" }]);
    const total = totalArr[0]?.count || 0;

    // Pagination
    if (isPagination === "true") {
      pipeline.push(
        { $skip: (page - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
      );
    }

    const categories = await Category.aggregate(pipeline);

    res.status(200).json(
      new apiResponse(
        200,
        {
          categories,
          totalCategories: total,
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
        },
        "Categories fetched successfully"
      )
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🔵 GET SINGLE CATEGORY
const getCategoryById = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid category ID"));
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Category not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, category, "Category fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🟠 UPDATE CATEGORY
const updateCategory = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid category ID"));
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedCategory) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Category not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, updatedCategory, "Category updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🔴 DELETE CATEGORY
const deleteCategory = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid category ID"));
    }

    const deletedCategory = await Category.findByIdAndDelete(req.params.id);

    if (!deletedCategory) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Category not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, deletedCategory, "Category deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
