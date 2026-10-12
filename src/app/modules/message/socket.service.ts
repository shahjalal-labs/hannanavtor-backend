import { WebSocketServer, WebSocket } from "ws";
import prisma from "../../../shared/prisma";
import { Request } from "express";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import { Secret } from "jsonwebtoken";
import config from "../../../config";
import { User } from "@prisma/client";
import { verifyWebSocketToken } from "../../../helpers/socket.service";

interface CustomWebSocket extends WebSocket {
  userId?: string;
}
const channelClients = new Map<string, Set<WebSocket>>();
const connectedUsers = new Set<CustomWebSocket>();
let wss;

export function setupWebSocketServer(server: any) {
  wss = new WebSocketServer({ server });

  wss.on("connection", async (ws: CustomWebSocket, req: Request) => {
    const token = req.headers["x-token"] as string;
    const decoded = verifyWebSocketToken(ws, token);
    if (!decoded) {
      return;
    }
    const userId = decoded.id;
    ws.userId = userId;
    connectedUsers.add(ws);
    console.log("New WebSocket connection established!");
    let connectedRoomId: string | null = null;

    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 30000);

    ws.on("message", async (message: any) => {
      try {
        const {
          type,
          referralId,
          message: content,
          fileUrl,
        } = JSON.parse(message.toString());

        switch (type) {
          case "subscribe": {
            if (!token) {
              return ws.send(
                JSON.stringify({
                  error: "You are not authorized, please login first",
                })
              );
            }
            const referral = await prisma.referral.findUnique({
              where: {
                id: referralId,
              },
            });
            if (!referral) {
              return ws.send(
                JSON.stringify({
                  error: "Referral ID is required",
                })
              );
            }
            let room = await prisma.room.upsert({
              where: {
                referralId_referrerId_providerId_clientId: {
                  referralId,
                  referrerId: referral.referrerId,
                  providerId: referral.providerId,
                  clientId: referral.clientId,
                },
              },
              update: {
                referralId,
                referrerId: referral.referrerId,
                providerId: referral.providerId,
                clientId: referral.clientId,
              },
              create: {
                referralId,
                referrerId: referral.referrerId,
                providerId: referral.providerId,
                clientId: referral.clientId,
                purpose: referral.purpose,
              },
            });

            connectedRoomId = room.id;

            channelClients.forEach((clients, key) => {
              if (clients.has(ws)) {
                clients.delete(ws);
                if (clients.size === 0) channelClients.delete(key);
              }
            });

            if (!channelClients.has(connectedRoomId)) {
              channelClients.set(connectedRoomId, new Set());
            }
            channelClients.get(connectedRoomId)?.add(ws);

            const pastMessages = await prisma.message.findMany({
              where: { roomId: connectedRoomId },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                    profileImage: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            });

            ws.send(
              JSON.stringify({
                type: "pastMessages",
                roomId: connectedRoomId,
                messages: pastMessages,
              })
            );
            break;
          }

          case "send-message": {
            if (!connectedRoomId) {
              return ws.send(
                JSON.stringify({
                  error: "You are not connected to this room",
                })
              );
            } else if (!token) {
              return ws.send(
                JSON.stringify({
                  error: "You are not authorized, please login first",
                })
              );
            }

            const verifiedUser = jwtHelpers.verifyToken(
              token as string,
              config.jwt.jwt_secret as Secret
            );
            req.user = verifiedUser as User;

            const roomInfo = await prisma.room.findUnique({
              where: {
                id: connectedRoomId,
              },
            });

            if (!roomInfo) {
              return ws.send(
                JSON.stringify({
                  error: "Room not found",
                })
              );
            }

            await prisma.message.create({
              data: {
                message: content,
                referrerId: roomInfo.referrerId,
                providerId: roomInfo.providerId,
                clientId: roomInfo.clientId,
                senderId: verifiedUser.id,
                roomId: connectedRoomId,
                fileUrl,
              },
            });

            await prisma.room.update({
              where: {
                id: connectedRoomId,
              },
              data: {
                updatedAt: new Date(),
              },
            });

            const pastMessages = await prisma.message.findMany({
              where: { roomId: connectedRoomId },
              include: {
                sender: {
                  select: {
                    id: true,
                    username: true,
                    profileImage: true,
                  },
                },
              },
              orderBy: { createdAt: "desc" },
            });

            channelClients.get(connectedRoomId)?.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({
                    type: "pastMessages",
                    messages: pastMessages,
                  })
                );
              }
            });
            break;
          }

          case "invite-call": {
            if (!connectedRoomId) {
              return ws.send(
                JSON.stringify({ error: "Not connected to any room" })
              );
            }

            const updatedRoom = await prisma.room.update({
              where: {
                id: connectedRoomId,
              },
              data: {
                meetingStatus: true,
                connectedUsers: {
                  push: userId,
                },
              },
            });

            channelClients.get(connectedRoomId)?.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({
                    type: "invite-call",
                    roomId: connectedRoomId,
                    messages: "You have new invitation for joining the call",
                  })
                );
                client.send(
                  JSON.stringify({
                    type: "status-call",
                    roomId: connectedRoomId,
                    message: "Meeting status retrived success",
                    status: updatedRoom?.meetingStatus,
                  })
                );
              }
            });

            ws.send(
              JSON.stringify({
                type: "invite-success",
                roomId: connectedRoomId,
                message: "Call invitation sent successfully",
              })
            );
            break;
          }

          case "join-call": {
            if (!connectedRoomId) {
              return ws.send(
                JSON.stringify({ error: "Not connected to any room" })
              );
            }

            const isRunning = await prisma.room.findUnique({
              where: {
                id: connectedRoomId,
                meetingStatus: true,
              },
            });

            if (!isRunning) {
              return ws.send(
                JSON.stringify({
                  error: "currently not running meeting in this room",
                })
              );
            }

            const updatedRoom = await prisma.room.update({
              where: {
                id: connectedRoomId,
              },
              data: {
                connectedUsers: {
                  push: userId,
                },
              },
            });

            // Notify all other users in the room
            channelClients.get(connectedRoomId)?.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({
                    type: "join-call",
                    roomId: connectedRoomId,
                    message: "A participant has joined the call",
                  })
                );
                client.send(
                  JSON.stringify({
                    type: "status-call",
                    roomId: connectedRoomId,
                    message: "Meeting status retrived success",
                    status: updatedRoom?.meetingStatus,
                  })
                );
              }
            });

            // Optional: Confirm to the user that they joined
            ws.send(
              JSON.stringify({
                type: "join-success",
                roomId: connectedRoomId,
                message: "You have joined the call successfully",
              })
            );

            break;
          }

          case "leave-call": {
            if (!connectedRoomId) {
              return ws.send(
                JSON.stringify({ error: "Not connected to any room" })
              );
            }

            const room = await prisma.room.findUnique({
              where: {
                id: connectedRoomId,
                meetingStatus: true,
              },
            });

            if (!room) {
              return ws.send(
                JSON.stringify({ error: "You cannot perform this action" })
              );
            }

            const updatedUsers = room.connectedUsers.filter(
              (id) => id !== userId
            );
            console.log(updatedUsers);

            let updatedRoom;

            if (updatedUsers.length === 0) {
              updatedRoom = await prisma.room.update({
                where: { id: connectedRoomId },
                data: {
                  meetingStatus: false,
                  connectedUsers: [],
                },
              });
            } else {
              updatedRoom = await prisma.room.update({
                where: { id: connectedRoomId },
                data: {
                  connectedUsers: updatedUsers,
                },
              });
            }

            // Notify all other users in the room
            channelClients.get(connectedRoomId)?.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(
                  JSON.stringify({
                    type: "leave-call",
                    roomId: connectedRoomId,
                    message: "A participant has leave the call",
                  })
                );
                client.send(
                  JSON.stringify({
                    type: "status-call",
                    roomId: connectedRoomId,
                    message: "Meeting status retrived success",
                    status: updatedRoom.meetingStatus,
                  })
                );
              }
            });

            ws.send(
              JSON.stringify({
                type: "leave-success",
                roomId: connectedRoomId,
                message: "You left the call successfully",
              })
            );
            ws.send(
              JSON.stringify({
                type: "status-call",
                roomId: connectedRoomId,
                message: "Meeting status retrived success",
                status: updatedRoom.meetingStatus,
              })
            );

            break;
          }

          case "status-call": {
            if (!connectedRoomId) {
              return ws.send(
                JSON.stringify({ error: "Not connected to any room" })
              );
            }

            const room = await prisma.room.findUnique({
              where: {
                id: connectedRoomId,
              },
            });

            ws.send(
              JSON.stringify({
                type: "status-call",
                roomId: connectedRoomId,
                message: "Meeting status retrived success",
                status: room?.meetingStatus,
              })
            );

            break;
          }

          default:
            ws.send(JSON.stringify({ error: "Invalid message type" }));
        }
      } catch (err: any) {
        console.error("Error processing WebSocket message:", err.message);
        ws.send(JSON.stringify({ error: "Invalid message format" }));
      }
    });

    ws.on("close", async () => {
      if (connectedRoomId && userId) {
        const clients = channelClients.get(connectedRoomId);
        clients?.delete(ws);
        if (clients?.size === 0) channelClients.delete(connectedRoomId);

        // 🧠 Remove user from connectedUsers in DB
        const room = await prisma.room.findUnique({
          where: { id: connectedRoomId },
          select: { connectedUsers: true },
        });

        if (room) {
          const updatedUsers = room.connectedUsers.filter(
            (id) => id !== userId
          );

          await prisma.room.update({
            where: { id: connectedRoomId },
            data: {
              connectedUsers: updatedUsers,
              ...(updatedUsers.length === 0 && { meetingStatus: false }),
            },
          });
        }
      }

      console.log("WebSocket client disconnected!");
      clearInterval(interval);
    });
  });
}

export const socket = { wss, channelClients };
