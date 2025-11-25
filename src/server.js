// ws-bridge/server.js
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 9000 });

const clients = {
    bot: null,
    users: {}
};

wss.on("connection", (socket, req) => {

   console.log(req.url);
    const url = new URL(req.url, "http://localhost");

    // FRONT WebApp kirganda ?user=USERID bo'ladi. LOCAL TEST bo'lsa null yoki undefined bo'ladi.
    let userId = url.searchParams.get("user");
    console.log("WS: connection from user =", userId);

    // LOCAL TEST uchun → userId null bo'lsa SENING ID bilan ishlasin
    if (!userId || userId === "null" || userId === "undefined") {
        userId = "1912055376"; // *** SENING DEFAULT USERING ***
    }

    socket.on("message", raw => {
        try {
            const str = raw.toString();
            console.log("WS RAW:", str.slice(0, 500));

            const data = JSON.parse(str);

            // ===== FRONT / BOT REGISTRATION =====
            if (data.type === "register") {

                // BOT ro'yxatdan o'tdi
                if (data.clientId === "bot") {
                    clients.bot = socket;
                    console.log("WS: BOT registered");
                    return;
                }

                // FRONT ro'yxatdan o'tdi
                if (data.clientId === "front") {
                    clients.users[userId] = socket;
                    console.log("WS: FRONT registered:", userId);
                    return;
                }
            }

            // ===== BOT → FRONT =====
            if (data.type === "send_to_front") {
                const payload = data.payload || {};
                const targetId = payload.targetUserId || userId;

                console.log("WS → Sending to FRONT:", targetId);

                const targetSocket = clients.users[targetId];

                if (targetSocket && targetSocket.readyState === 1) {
                    targetSocket.send(JSON.stringify(payload));
                } else {
                    console.log("WS: FRONT user not connected:", targetId);
                }

                return;
            }

            // ===== FRONT → BOT =====
            if (data.type === "send_to_bot") {
                const bot = clients.bot;

                if (bot && bot.readyState === 1) {
                    bot.send(JSON.stringify({
                        type: "send_to_bot",
                        payload: data.payload
                    }));
                } else {
                    console.log("WS: BOT not connected");
                }

                return;
            }

        } catch (err) {
            console.log("WS error:", err);
        }
    });

    socket.on("close", () => {
        console.log("WS: Client disconnected", userId);

        if (clients.users[userId] === socket) {
            delete clients.users[userId];
        }

        if (clients.bot === socket) {
            clients.bot = null;
        }
    });
});

console.log("WS Bridge running on ws://localhost:9000");
