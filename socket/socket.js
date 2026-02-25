// import { Server } from "socket.io";

// const onlineUsers = new Map();
// let io;

// export const initSocket = (server) => {
//     io = new Server(server, {
//         cors: {
//             origin: "*",
//         },
//     });

//     io.on("connection", (socket) => {
//         console.log("Socket connected:", socket.id);

//         socket.on("register", (userId) => {
//             onlineUsers.set(userId.toString(), socket.id);
//         });

//         socket.on("disconnect", () => {
//             for (const [key, value] of onlineUsers.entries()) {
//                 if (value === socket.id) {
//                     onlineUsers.delete(key);
//                     break;
//                 }
//             }
//         });
//     });
// };

// export const getIO = () => io;
// export const getSocketIdByUser = (userId) =>
//     onlineUsers.get(userId.toString());




import { Server } from "socket.io";

const onlineUsers = new Map();
let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });



    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);

        // 🔐 Register User / Driver
        socket.on("register", (userId) => {
            onlineUsers.set(userId.toString(), socket.id);
        });

        // 🚕 Join ride-based chat room
        socket.on("joinRide", ({ rideId }) => {
            socket.join(rideId);
            console.log(`Socket ${socket.id} joined ride ${rideId}`);
        });

        // ✍️ Typing indicator
        socket.on("typing", ({ rideId, senderType }) => {
            socket.to(rideId).emit("typing", { senderType });
        });

        // ❌ Disconnect cleanup
        socket.on("disconnect", () => {
            for (const [key, value] of onlineUsers.entries()) {
                if (value === socket.id) {
                    onlineUsers.delete(key);
                    break;
                }
            }
            console.log("Socket disconnected:", socket.id);
        });
    });
};

export const getIO = () => io;
export const getSocketIdByUser = (userId) =>
    onlineUsers.get(userId.toString());
