const express = require("express");
const router = express.Router();

// controller
const order_controller = require("../controllers/order_controller");

// 로그인 체크
const check = require("../middleware/login_check");

// 발송자 운송자 평가
router.post("/review", check.loginCheck, order_controller.requestUserReview);

// 발송내역 detail
router.get("/:id", check.loginCheck, order_controller.getOrderDetail);

// 발송 내역 리스트
router.get(
  "/history/:id",
  check.loginCheck,
  order_controller.getHistoryOrderLists
);

// 발송 완료 내역 리스트
router.get(
  "/history/finish/:id",
  check.loginCheck,
  order_controller.getFinishedOrderLists
);

// 요청 불러오기
router.get("/", check.loginCheck, order_controller.getOrderLists);

// 요청 등록
router.post("/", order_controller.createOrder);

// 요청 취소
router.delete("/:id", check.loginCheck, order_controller.cancelOrder);

module.exports = router;
