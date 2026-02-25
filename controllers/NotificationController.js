import Notification from "../models/Notification.modal.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import mongoose from "mongoose";
import admin from "../firebase/firebaseAdmin.js";

const createNotification = asyncHandler(async (req, res) => {
    const { userId, userRole, title, message, payload } = req.body;

    if (!userId || !title || !message) {
        return res
            .status(400)
            .json(new apiResponse(400, null, "userId, title and message are required"));
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res
            .status(400)
            .json(new apiResponse(400, null, "Invalid userId"));
    }

    const notification = await Notification.create({
        userId,
        userRole,
        title: title.trim(),
        message: message.trim(),
        payload,
    });

    res
        .status(201)
        .json(
            new apiResponse(201, notification, "Notification created successfully")
        );
});



export const createNotifications = async ({
    userId,
    userRole,
    ride,
    driver,
    title,
    message,
    isRead = false,
    payload,
    fcmToken,
    screen,
}) => {
    try {
        if (!title || !message) {
            throw new Error("Missing required fields: title, comment, or userId.");
        }


        console.log("screen", screen);



        const notification = new Notification({
            userId,
            userRole,
            ride,
            driver,
            title,
            message,
            isRead,
            payload,
            fcmToken,
            screen,

        });
        const savedNotification = await notification.save();



        if (fcmToken) {
            const message1 = {
                notification: {
                    title: title,
                    body: message,
                },
                data: {
                    title: title,
                    body: message,
                    screen: screen,
                },
                token: fcmToken,
                android: {
                    priority: "high",
                },
                apns: {
                    headers: {
                        "apns-priority": "10",
                    },
                },
            };


            await admin.messaging().send(message1);
        }



        return savedNotification;
    } catch (error) {
        console.error("Error creating notification:", error.message);
        return null;
    }
};

const getAllNotifications = asyncHandler(async (req, res) => {
    const {
        userId,
        userRole,
        driver,
        isRead,
        fromDate,
        toDate,
        isPagination = "true",
        page = 1,
        limit = 10,
    } = req.query;

    const match = {};

    /* ======================================================
       FILTERS
    ====================================================== */

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        match.userId = new mongoose.Types.ObjectId(userId);
    }

    if (driver && mongoose.Types.ObjectId.isValid(driver)) {
        match.driver = new mongoose.Types.ObjectId(driver);
    }

    if (userRole) {
        match.userRole = userRole;
    }

    if (isRead !== undefined) {
        match.isRead = isRead === "true";
    }

    if (fromDate || toDate) {
        match.createdAt = {};
        if (fromDate) match.createdAt.$gte = new Date(fromDate);
        if (toDate) {
            const nextDay = new Date(toDate);
            nextDay.setDate(nextDay.getDate() + 1);
            match.createdAt.$lt = nextDay;
        }
    }

    /* ======================================================
       AGGREGATION PIPELINE
    ====================================================== */

    const pipeline = [{ $match: match }];

    const readUnreadArr = await Notification.aggregate([
        { $match: match },
        {
            $group: {
                _id: "$isRead",
                count: { $sum: 1 },
            },
        },
    ]);

    let readCount = 0;
    let unreadCount = 0;

    readUnreadArr.forEach(item => {
        if (item._id === true) readCount = item.count;
        if (item._id === false) unreadCount = item.count;
    });

    /* ================= USER ================= */
    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user",
            },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } }
    );

    /* ================= DRIVER ================= */
    pipeline.push(
        {
            $lookup: {
                from: "taxidrivers",
                localField: "driver",
                foreignField: "_id",
                as: "driverDetails",
            },
        },
        {
            $unwind: {
                path: "$driverDetails",
                preserveNullAndEmptyArrays: true,
            },
        }
    );

    /* ================= RIDE (DEEP POPULATE) ================= */
    pipeline.push({
        $lookup: {
            from: "rides",
            let: { rideId: "$ride" },
            pipeline: [
                {
                    $match: {
                        $expr: { $eq: ["$_id", "$$rideId"] },
                    },
                },

                /* user */
                {
                    $lookup: {
                        from: "users",
                        localField: "user",
                        foreignField: "_id",
                        as: "user",
                    },
                },
                { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

                /* route */
                {
                    $lookup: {
                        from: "routes",
                        localField: "route",
                        foreignField: "_id",
                        as: "route",
                    },
                },
                { $unwind: { path: "$route", preserveNullAndEmptyArrays: true } },

                /* pickupLocation */
                {
                    $lookup: {
                        from: "stations",
                        localField: "pickupLocation",
                        foreignField: "_id",
                        as: "pickupLocation",
                    },
                },
                {
                    $unwind: {
                        path: "$pickupLocation",
                        preserveNullAndEmptyArrays: true,
                    },
                },

                /* dropLocation */
                {
                    $lookup: {
                        from: "stations",
                        localField: "dropLocation",
                        foreignField: "_id",
                        as: "dropLocation",
                    },
                },
                {
                    $unwind: {
                        path: "$dropLocation",
                        preserveNullAndEmptyArrays: true,
                    },
                },
            ],
            as: "rideDetails",
        },
    });

    pipeline.push({
        $unwind: {
            path: "$rideDetails",
            preserveNullAndEmptyArrays: true,
        },
    });

    /* ================= SORT ================= */
    pipeline.push({ $sort: { createdAt: -1, _id: -1 } });

    /* ================= TOTAL COUNT ================= */
    const totalArr = await Notification.aggregate([
        ...pipeline,
        { $count: "count" },
    ]);
    const total = totalArr[0]?.count || 0;

    /* ================= PAGINATION ================= */
    if (isPagination === "true") {
        pipeline.push(
            { $skip: (page - 1) * parseInt(limit) },
            { $limit: parseInt(limit) }
        );
    }

    /* ================= EXECUTE ================= */
    const notifications = await Notification.aggregate(pipeline);

    /* ================= RESPONSE ================= */
    res.status(200).json(
        new apiResponse(
            200,
            {
                notifications,
                totalNotifications: total,
                readCount,
                unreadCount,
                totalPages:
                    isPagination === "true" ? Math.ceil(total / limit) : 1,
                currentPage: isPagination === "true" ? Number(page) : null,
            },
            "Notifications fetched successfully"
        )
    );
});

const getNotificationById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
            .status(400)
            .json(new apiResponse(400, null, "Invalid notification ID"));
    }

    const notification = await Notification.findById(id)
        .populate({
            path: "userId",
            select: "name email role", // jo fields chahiye
        })
        .populate({
            path: "driver",
            select: "name phone vehicleNumber status",
        })
        .populate({
            path: "ride",
            select: "pickup drop fare distance status",
        });

    if (!notification) {
        return res
            .status(404)
            .json(new apiResponse(404, null, "Notification not found"));
    }

    res.status(200).json(
        new apiResponse(
            200,
            notification,
            "Notification fetched successfully"
        )
    );
});

const markNotificationAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
            .status(400)
            .json(new apiResponse(400, null, "Invalid notification ID"));
    }

    const notification = await Notification.findByIdAndUpdate(
        id,
        { isRead: true, readAt: new Date() },
        { new: true }
    );

    if (!notification) {
        return res
            .status(404)
            .json(new apiResponse(404, null, "Notification not found"));
    }

    res
        .status(200)
        .json(
            new apiResponse(200, notification, "Notification marked as read")
        );
});

const markAllAsRead = asyncHandler(async (req, res) => {
    const { userId, driver } = req.body;


    if (driver) {

        await Notification.updateMany(
            { driver, isRead: false },
            { isRead: true, readAt: new Date() }
        );
    }
    if (userId) {

        await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );
    }


    res
        .status(200)
        .json(new apiResponse(200, null, "All notifications marked as read"));
});

const deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
            .status(400)
            .json(new apiResponse(400, null, "Invalid notification ID"));
    }

    const deleted = await Notification.findByIdAndDelete(id);

    if (!deleted) {
        return res
            .status(404)
            .json(new apiResponse(404, null, "Notification not found"));
    }

    res
        .status(200)
        .json(new apiResponse(200, deleted, "Notification deleted successfully"));
});



export {
    createNotification,
    getAllNotifications,
    getNotificationById,
    markNotificationAsRead,
    markAllAsRead,
    deleteNotification,
};
