var express = require("express");
var router = express.Router();

const deliver_controller = require("../controllers/deliver_controller");

// 로그인 체크
const check = require("../middleware/login_check");

/* GET home page. */

// 발송자 리뷰
router.post("/review", check.loginCheck, deliver_controller.deliverUserReview);

// 운송 detail put 픽업사진 배송완료 사진 등록
router.put("/:id", check.loginCheck, deliver_controller.updateDeliver);

// 운송 내역 디테일
router.get("/:id", check.loginCheck, deliver_controller.getDeliverDetail);

// 운송 내역 리스트
router.get(
  "/history/:id",
  check.loginCheck,
  deliver_controller.getHistoryDeliverLists
);

// 운송 완료 내역 리스트
router.get(
  "/history/finish/:id",
  check.loginCheck,
  deliver_controller.getFinishedDeliverLists
);
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 매칭하기
router.post("/", check.loginCheck, deliver_controller.match);

// 매칭 취소
router.delete("/:id", check.loginCheck, deliver_controller.cancelMatch);

module.exports = router;
