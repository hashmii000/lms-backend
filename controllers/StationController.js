import Station from "../models/Station.modal.js";
import Route from "../models/Route.modal.js";
import mongoose from "mongoose";


export const createStation = async (req, res) => {
    try {
        const { title, route, isActive } = req.body;

        if (!title?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Station title is required",
            });
        }

        if (!route || !mongoose.Types.ObjectId.isValid(route)) {
            return res.status(400).json({
                success: false,
                message: "Valid routeId is required",
            });
        }

        // 🔹 Check route exists
        const routeExists = await Route.findById(route);
        if (!routeExists) {
            return res.status(404).json({
                success: false,
                message: "Route not found",
            });
        }

        // 🔹 DUPLICATE CHECK (same title in same route)
        const existingStation = await Station.findOne({
            route,
            title: { $regex: `^${title.trim()}$`, $options: "i" }, // case-insensitive
        });

        if (existingStation) {
            return res.status(409).json({
                success: false,
                message: `Station '${title}' already exists for this route`,
            });
        }

        const station = await Station.create({
            title: title.trim(),
            route,
            isActive: isActive !== undefined ? isActive : true,
        });

        return res.status(201).json({
            success: true,
            message: "Station created successfully",
            data: station,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to create station",
            error: error.message,
        });
    }
};



export const getAllStations = async (req, res) => {
    try {
        const {
            route,
            isActive,
            search,
            isPagination = "true",
            page = 1,
            limit = 10,
        } = req.query;

        const match = {};

        if (route && mongoose.Types.ObjectId.isValid(route)) {
            match.route = route;
        }

        if (isActive !== undefined) {
            match.isActive = isActive === "true";
        }

        if (search?.trim()) {
            match.title = { $regex: search.trim(), $options: "i" };
        }

        let query = Station.find(match)
            .populate("route", "title isActive")
            .sort({ createdAt: -1 });

        const total = await Station.countDocuments(match);

        if (isPagination === "true") {
            query = query
                .skip((page - 1) * Number(limit))
                .limit(Number(limit));
        }

        const stations = await query;

        return res.status(200).json({
            success: true,
            message: "Stations fetched successfully",
            data: {
                stations,
                total,
                totalPages:
                    isPagination === "true" ? Math.ceil(total / limit) : 1,
                currentPage:
                    isPagination === "true" ? Number(page) : null,
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch stations",
            error: error.message,
        });
    }
};


export const getStationById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid station ID",
            });
        }

        const station = await Station.findById(id).populate(
            "route",
            "title isActive"
        );

        if (!station) {
            return res.status(404).json({
                success: false,
                message: "Station not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Station fetched successfully",
            data: station,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch station",
            error: error.message,
        });
    }
};


export const updateStation = async (req, res) => {
    try {
        const { id } = req.params;
        const { route } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid station ID",
            });
        }

        if (route && !mongoose.Types.ObjectId.isValid(route)) {
            return res.status(400).json({
                success: false,
                message: "Invalid route ID",
            });
        }

        if (route) {
            const routeExists = await Route.findById(route);
            if (!routeExists) {
                return res.status(404).json({
                    success: false,
                    message: "Route not found",
                });
            }
        }

        const station = await Station.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        ).populate("route", "title isActive");

        if (!station) {
            return res.status(404).json({
                success: false,
                message: "Station not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Station updated successfully",
            data: station,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to update station",
            error: error.message,
        });
    }
};


export const deleteStation = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid station ID",
            });
        }

        const station = await Station.findByIdAndDelete(id);

        if (!station) {
            return res.status(404).json({
                success: false,
                message: "Station not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Station deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to delete station",
            error: error.message,
        });
    }
};
