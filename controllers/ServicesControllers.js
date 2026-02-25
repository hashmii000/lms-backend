import Services from "../models/services.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";

// 🟢 CREATE SERVICE
const createService = asyncHandler(async (req, res) => {
  try {
    const { name, isActive } = req.body;

    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Service name is required"));
    }

    // Optional: check duplicate
    const existingService = await Services.findOne({ name: name.trim() });
    if (existingService) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Service with this name already exists"));
    }

    const service = await Services.create({
      name: name.trim(),
      isActive: isActive !== undefined ? isActive : true,
    });

    res
      .status(201)
      .json(new apiResponse(201, service, "Service created successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🟡 GET ALL SERVICES (with pagination + search)
const getAllServices = asyncHandler(async (req, res) => {
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
    const totalArr = await Services.aggregate([...pipeline, { $count: "count" }]);
    const total = totalArr[0]?.count || 0;

    // Pagination
    if (isPagination === "true") {
      pipeline.push(
        { $skip: (page - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
      );
    }

    const services = await Services.aggregate(pipeline);

    res.status(200).json(
      new apiResponse(
        200,
        {
          services,
          totalServices: total,
          totalPages: Math.ceil(total / limit),
          currentPage: Number(page),
        },
        "Services fetched successfully"
      )
    );
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🔵 GET SINGLE SERVICE
const getServiceById = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid service ID"));
    }

    const service = await Services.findById(req.params.id);

    if (!service) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Service not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, service, "Service fetched successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🟠 UPDATE SERVICE
const updateService = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid service ID"));
    }

    const updatedService = await Services.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedService) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Service not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, updatedService, "Service updated successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

// 🔴 DELETE SERVICE
const deleteService = asyncHandler(async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json(new apiResponse(400, null, "Invalid service ID"));
    }

    const deletedService = await Services.findByIdAndDelete(req.params.id);

    if (!deletedService) {
      return res
        .status(404)
        .json(new apiResponse(404, null, "Service not found"));
    }

    res
      .status(200)
      .json(new apiResponse(200, deletedService, "Service deleted successfully"));
  } catch (error) {
    res.status(500).json(new apiResponse(500, null, `Error: ${error.message}`));
  }
});

export {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
};
