const express = require("express");
const router = express.Router();

//db models
const db = require("../models");
const Op = db.Sequelize.Op;

// 아임포트 config
const { Iamporter, IamporterError } = require("iamporter");
const iamport_config = require("../config/iamport_config");

// 로그인 체크
const check = require("../middleware/login_check");
// moment
const moment = require("moment");
// axios
const axios = require("axios");
const qs = require("querystring");

// openbanking config
const openbanking_config = require("../config/openbanking_config");

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// 환전
router.post("/transfer", check.loginCheck, async (req, res) => {
  let user = await db.User.findOne({
    where: {
      id: req.user.id
    }
  });
  let amount = req.body.amount;
  // console.log(req.user);
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // 오픈뱅킹 access token 먼저 받아오기
  const openbanking_url = "https://testapi.openbanking.or.kr";
  var data = {
    client_id: `${openbanking_config.openbanking_config.dev_client_id}`,
    client_secret: `${openbanking_config.openbanking_config.dev_client_secret}`,
    scope: "oob",
    grant_type: "client_credentials"
  };
  const openbanking_getToken = await axios({
    url: `${openbanking_url}/oauth/2.0/token`,
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    data: qs.stringify(data)
  }).catch(err => {
    console.log(err);
    res.json({
      err
    });
  });
  const openbanking_access_token = openbanking_getToken.data.access_token;
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // 오픈 뱅킹 입금 이체 api
  const openbanking_transit = await axios({
    url: `${openbanking_url}/v2.0/transfer/deposit/acnt_num`,
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${openbanking_access_token}`
    },
    data: {
      cntr_account_type: "N", // 약정, 계좌/계정 구분 N:계좌, C:계정
      cntr_account_num: `${openbanking_config.openbanking_config.cntr_account_num}`, // 약정 계좌/계정 번호
      wd_pass_phrase: "NONE", // 입금이체용 암호문구 -> 계약시 적용
      wd_print_content: "딜리버러 환전", // 출금계좌인자내역
      name_check_option: "on", // 수취인 성명검증 여부
      tran_dtime: `${moment().format("YYYYMMDDHHmmss")}`, // 요청 일시
      req_cnt: "1", // 입금요청건수
      req_list: [
        // 입금요청 목록 -> 우리의 경우 한사람이 자기한테 이체하므로 그런거 없다
        {
          tran_no: "1", //거래순번
          bank_tran_id: `T991597690U${moment().format("HHmmss")}${
            user.bank_tran_id
          }`, // 은행거래고유번호
          bank_code_std: user.bank, // 입금은행 표준코드
          account_num: user.bankNum, // 계좌번호
          account_holder_name: user.name, // 입금계좌예금주명
          print_content: "딜리버러 환전", // 입금계좌인자내역
          tran_amt: amount, //"11000", // 환전 요청 들어온 금액
          req_client_name: user.name, //요청고객성명
          req_client_bank_code: user.bank, // 요청고객계좌 개설기관 표준코드
          req_client_account_num: user.bankNum, // 요청 고객 계좌번호
          req_client_num: user.id, // 요청고객회원번호
          transfer_purpose: "TR"
        }
      ]
    }
  });
  console.log(openbanking_transit.data);
  if (openbanking_transit) {
    // 이체 결과 저장
    const api_tran_id = openbanking_transit.data.api_tran_id;
    const rsp_code = openbanking_transit.data.rsp_code;
    const rsp_message = openbanking_transit.data.rsp_message;
    const api_tran_dtm = openbanking_transit.data.api_tran_dtm;
    const wd_bank_code_std = openbanking_transit.data.wd_bank_code_std;
    const wd_bank_code_sub = openbanking_transit.data.wd_bank_code_sub;
    const wd_bank_name = openbanking_transit.data.wd_bank_name;
    const wd_account_num_masked =
      openbanking_transit.data.wd_account_num_masked;
    const wd_print_content = openbanking_transit.data.wd_print_content;
    const wd_account_holder_name =
      openbanking_transit.data.wd_account_holder_name;
    const res_cnt = openbanking_transit.data.res_cnt;
    const tran_no = openbanking_transit.data.res_list[0].tran_no;
    const bank_tran_id = openbanking_transit.data.res_list[0].bank_tran_id;
    const bank_tran_date = openbanking_transit.data.res_list[0].bank_tran_date;
    const bank_code_tran = openbanking_transit.data.res_list[0].bank_code_tran;
    const bank_rsp_code = openbanking_transit.data.res_list[0].bank_rsp_code;
    const bank_rsp_message =
      openbanking_transit.data.res_list[0].bank_rsp_message;
    const bank_code_std = openbanking_transit.data.res_list[0].bank_code_std;
    const bank_code_sub = openbanking_transit.data.res_list[0].bank_code_sub;
    const bank_name = openbanking_transit.data.res_list[0].bank_name;
    const account_num = openbanking_transit.data.res_list[0].account_num;
    const account_num_masked =
      openbanking_transit.data.res_list[0].account_num_masked;
    const print_content = openbanking_transit.data.res_list[0].print_content;
    const tran_amt = openbanking_transit.data.res_list[0].tran_amt;
    const account_holder_name =
      openbanking_transit.data.res_list[0].account_holder_name;

    //
    await db.Transfer.create({
      api_tran_id,
      rsp_code,
      rsp_message,
      api_tran_dtm,
      wd_bank_code_std,
      wd_bank_code_sub,
      wd_bank_name,
      wd_account_num_masked,
      wd_print_content,
      wd_account_holder_name,
      res_cnt,
      tran_no,
      bank_tran_id,
      bank_tran_date,
      bank_code_tran,
      bank_rsp_code,
      bank_rsp_message,
      bank_code_std,
      bank_code_sub,
      bank_name,
      account_num,
      account_num_masked,
      print_content,
      tran_amt,
      account_holder_name
    }).catch(err => {
      res.json({
        code: -1,
        err
      });
    });

    // 성공했을시 유저 price 빼주기
    if (openbanking_transit.data.rsp_code == "A0000") {
      // user price 빼주기
      await db.User.update(
        {
          price: db.sequelize.literal(`price - ${amount}`),
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        { where: { id: user.id } }
      ).catch(err => {
        console.log(err);
      });
    }

    res.json({
      code: 200,
      data: openbanking_transit.data
    });
  }
  ////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
});

// 결제 수단 삭제
router.delete("/:customer_uid", check.loginCheck, async (req, res) => {
  const iamporter = new Iamporter({
    apiKey: iamport_config.iamport_config.apiKey,
    secret: iamport_config.iamport_config.apiSecretKey
  });
  const result = await iamporter
    .deleteSubscription(req.params.customer_uid)
    .catch(err => {
      res.json({
        code: -1,
        err
      });
    });

  console.log(result);

  // 내 DB에서도 삭제
  db.Payment.destroy({
    where: { customer_uid: req.params.customer_uid }
  }).then(payment_result => {
    console.log(payment_result);
    res.json({
      code: 200
    });
  });
});

// 유저 payment list 가지고오기
router.get("/", check.loginCheck, (req, res) => {
  db.Payment.findAll({
    where: { userId: req.user.id },
    order: [["createdAt", "DESC"]]
  })
    .then(result => {
      res.json({
        code: 200,
        data: result
      });
    })
    .catch(err => {
      res.json({
        code: -1,
        data: err
      });
    });
});

// 빌링키 저장
router.post("/", check.loginCheck, async (req, res) => {
  // console.log(req.body);

  // For Testing
  // const iamporter = new Iamporter();
  // 실제로 사용할 때에
  const iamporter = new Iamporter({
    apiKey: iamport_config.iamport_config.apiKey,
    secret: iamport_config.iamport_config.apiSecretKey
  });
  // 아임포트 토큰값 가지고 오기
  // const iamport_token = await iamporter.getToken();

  let result = await iamporter
    .createSubscription({
      customer_uid: req.body.customer_uid,
      card_number: req.body.card_number,
      expiry: req.body.expiry,
      birth: req.body.birth,
      pwd_2digit: req.body.pwd_2digit
    })
    .catch(err => {
      if (err instanceof IamporterError) console.log(err);
      res.json({
        code: err.raw.code,
        msg: err.raw.message
      });
    });

  if (result.raw.code == 0) {
    db.Payment.create({
      // userId: 1,
      userId: req.user.id,
      customer_uid: result.data.customer_uid,
      card_name: result.data.card_name,
      card_number: result.data.card_number,
      createdAt: moment().format("YYYY-MM-DD HH:mm:ss"),
      updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
    })
      .then(paymentResult => {
        // console.log(paymentResult);
        res.json({
          code: 200,
          paymentResult
        });
      })
      .catch(err => {
        // console.log(err.parent.errno);
        res.json({
          code: err.parent.errno,
          msg: err.parent.sqlMessage
        });
      });
  }

  // console.log(result.data);

  // 빌링키 발급
  // 성공시 서버에 customer_uid 저장
});

// 입금 이체 call back
router.post("/transit", (req, res) => {});

module.exports = router;
