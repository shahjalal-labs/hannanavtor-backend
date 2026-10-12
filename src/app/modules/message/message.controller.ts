import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { messageService } from "./message.service";

const myRooms = catchAsync(async (req, res) => {
  const rooms = await messageService.myRoomsFromDB(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "My rooms retrieved successfully",
    data: rooms,
  });
});

const generateFileUrl = catchAsync(async (req, res) => {
  const fileUrl = await messageService.urlGenerate(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "File URL generated successfully",
    data: fileUrl,
  });
});

const generateAccessToken = catchAsync(async (req, res) => {
  const accessToken = await messageService.generateAccessTokenInAgora(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Access token generate successfully",
    data: accessToken,
  });
});

export const messageControllers = {
  myRooms,
  generateFileUrl,
  generateAccessToken,
};
