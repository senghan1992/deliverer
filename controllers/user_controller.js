//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////
// db
const db = require("../models");
const Op = db.Sequelize.Op;

// 암호화
const bcrypt = require("bcrypt");
const saltRounds = 10;

// jwt token
const jwt = require("jsonwebtoken");
const jwt_config = require("../config/jwt_config");

//moment
const moment = require("moment");

// 아임포트 설정
const { Iamporter, IamporterError } = require("iamporter");
const iamport_config = require("../config/iamport_config");
const axios = require("axios").default;

// // AWS
const AWS = require("aws-sdk");
const config = require("../config/aws_config");
AWS.config.update({
  accessKeyId: config.aws.accessKeyId,
  secretAccessKey: config.aws.secretAccessKey,
  region: config.aws.region
});

// mail 설정
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "deliverer.cs@gmail.com",
    pass: "red**--11"
  }
});

// 트랜잭션
// const transaction = await db.sequelize.transaction();
// try {
// } catch (err) {
//   // Rollback transaction if any errors were encountered
//   await transaction.rollback();
// }

function make_bank_tran_id() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (var i = 0; i < 3; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

function makeid() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  for (var i = 0; i < 6; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}

//////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////

// new password
async function newPassword(req, res) {
  let user_email = req.body.email;
  let user_phone = req.body.phone;
  let user_password = req.body.password;

  // 암호화 한 비밀번호
  const salt = bcrypt.genSaltSync(saltRounds);
  user_password = bcrypt.hashSync(user_password, salt);

  try {
    // 유저 비밀번호 업데이트
    let user = await db.User.findOne({
      where: {
        email: user_email,
        phone: user_phone
      }
    });

    await db.User.update(
      { password: user_password },
      { where: { id: user.id } }
    );

    res.json({
      code: 200,
      data: "",
      msg: "비밀번호 변경 성공"
    });
  } catch (err) {
    console.log(err);
    res.json({
      code: -1,
      data: err,
      msg: "error"
    });
  }
}

// 비밀번호 찾기 인증번호 보내기
async function findPassword(req, res) {
  // console.log(makeid());
  // return;
  let user_name = req.body.name;
  let user_email = req.body.email;
  let user_phone = req.body.phone;

  try {
    let user_phone_result = await db.User.findOne({
      where: { phone: user_phone }
    });

    if (user_phone_result) {
      let user_result = await db.User.findOne({
        attributes: ["email"],
        where: {
          name: user_name,
          email: user_email
        }
      });

      if (user_result) {
        // 난수발생
        var tmp_password = makeid();
        // console.log(user_result.email);
        var mailOption = {
          from: "deliverer.cs@gmail.com",
          to: user_result.email,
          subject: "딜리버러 비밀번호 재설정",
          text: `인증문자는 ${tmp_password} 입니다`
        };
        transporter.sendMail(mailOption, (err, info) => {
          if (err) console.error("Send Mail error : ", err);
          else console.log("Message sent  ", info);
        });
        res.json({
          code: 200,
          data: tmp_password,
          msg: "비밀번호 인증문자"
        });
      } else {
        res.json({
          code: 401,
          data: "",
          msg: "핸드폰 번호와 사용자명/생년월일이 일치하지 않습니다"
        });
      }
    } else {
      res.json({
        code: 404,
        data: "",
        msg: "해당 번호로 가입한 이력이 없습니다"
      });
    }
  } catch (err) {
    console.log(err);
    res.json({
      code: -1,
      data: err,
      msg: "error"
    });
  }
}

// 아이디 찾기
async function findEmail(req, res) {
  let user_name = req.body.name;
  let user_phone = req.body.phone;

  try {
    let user_phone_result = await db.User.findOne({
      where: { phone: user_phone }
    });

    if (user_phone_result) {
      let user_result = await db.User.findOne({
        attributes: ["email"],
        where: { name: user_name }
      });

      if (user_result) {
        res.json({
          code: 200,
          data: user_result,
          msg: "아이디 찾기 성공"
        });
      } else {
        res.json({
          code: 401,
          data: "",
          msg: "핸드폰 번호와 사용자명/생년월일이 일치하지 않습니다"
        });
      }
    } else {
      res.json({
        code: 404,
        data: "",
        msg: "해당 번호로 가입한 이력이 없습니다"
      });
    }
  } catch (err) {
    console.log(err);
    res.json({
      code: -1,
      data: err,
      msg: "error"
    });
  }
}

// 본인인증 call back
async function certificate(req, res) {
  let imp_uid = req.body.imp_uid;
  try {
    const getToken = await axios({
      url: "https://api.iamport.kr/users/getToken",
      method: "post",
      headers: { "Content-Type": "application/json" },
      data: {
        imp_key: "2586720024990948",
        imp_secret:
          "mwnCrEKHcymVNnX3QUYSPsJaUjuEGac3GAF8eqQqYcmMAjPqeOj3g3eamIP3S26zCMIRcyhbLEXlXNMc"
      }
    });

    const { access_token } = getToken.data.response;

    // imp_uid로 인증 정보 조회
    const getCertifications = await axios({
      url: `https://api.iamport.kr/certifications/${imp_uid}`,
      method: "get",
      headers: { Authorization: access_token }
    });

    const certificationsInfo = getCertifications.data.response;
    // console.log(certificationsInfo);

    // return;

    const {
      unique_key,
      unique_in_site,
      name,
      gender,
      birthday,
      phone
    } = certificationsInfo;

    const birth_array = birthday.split("-");
    const birth = birth_array[0].substring(2) + birth_array[1] + birth_array[2];

    // // 연령 제한 로직
    // if (new Date(birth).getFullYear() <= 1999) {
    //   // 연령 만족
    // } else {
    //   // 연령 미달
    // }

    //
    // 핸드폰 번호 중복 막기
    let user_phone_result = await db.User.findOne({
      where: { phone: phone }
    });
    if (user_phone_result) {
      res.json({
        code: 600,
        data: "",
        msg: "이미 있는 전화번호"
      });
      return;
    }
    //

    await db.User.update(
      {
        updateAt: moment().format("YYYY-MM-DD HH:mm:ss"),
        name: name,
        gender: gender,
        birth: birth,
        phone: phone
      },
      { where: { id: req.user.id } }
    );

    let user_data = await db.User.findOne({ where: { id: req.user.id } });
    const token = jwt.sign({ user: user_data }, jwt_config.jwt_config.secret, {
      expiresIn: "30 days"
    });

    res.json({
      code: 200,
      data: {
        name: name,
        birth: birth,
        gender: gender,
        phone: phone,
        token,
        user: { id: req.user.id }
      },
      msg: ""
    });
    return;
    // 1인 1계정 허용 로직도 여기서 사용가능
    // res.json({
    //   code: 200,
    //   data: {
    //     name: name,
    //     birth: birth,
    //     gender: gender,
    //     phone: phone
    //   },
    //   msg: ""
    // });

    // console.log("res.json 나갔다");
  } catch (e) {
    console.log(e);
    res.json({
      code: -1,
      data: e,
      msg: "error"
    });
  }
}

// user profile image update
async function updateUserImage(req, res) {
  let userId = req.user.id;
  let kind = req.body.kind;

  if (kind == "new") {
    // console.log(req.files);
    let imageUrl = `images/profiles/${new Date().getMonth() +
      1}/${new Date().getDate()}/${req.files.profile.name}`;

    console.log(imageUrl);

    const S3 = new AWS.S3();

    let param = {
      Bucket: "deliverer.app",
      Key: imageUrl,
      ACL: "public-read",
      Body: req.files.profile.data, // 저장되는 데이터. String, Buffer, Stream 이 올 수 있다
      ContentType: "image/png" // MIME 타입
    };

    S3.upload(param, (err, data) => {
      if (err)
        res.json({
          code: -1,
          data: err,
          msg: "S3 upload 실패"
        });
    });

    try {
      let result = await db.User.update(
        {
          profile: imageUrl,
          updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
        },
        { where: { id: userId } }
      );
      res.json({
        code: 200,
        data: imageUrl,
        msg: "user profile udpate success"
      });
    } catch (err) {
      res.json({
        code: -1,
        data: err,
        msg: "user update err"
      });
    }
  } else if (kind == "normal") {
    let result = await db.User.update(
      { profile: null, updatedAt: moment().format("YYYY-MM-DD HH:mm:ss") },
      { where: { id: userId } }
    ).catch(err => {
      res.json({
        code: -1,
        data: err,
        msg: "user update err"
      });
    });
    res.json({
      code: 200,
      data: result,
      msg: "user profile udpate success"
    });
  } else if (kind == "drop") {
    let order_list = await db.Order.findAll({
      where: { requestId: userId, status: { [Op.ne]: "F" } }
    });
    let deliver_list = await db.Deliver.findAll({
      where: { delivererId: userId, status: { [Op.ne]: "F" } }
    });

    // console.log(order_list);
    // console.log(deliver_list);

    if (order_list.length > 0 || deliver_list.length > 0) {
      res.json({
        code: 400,
        data: "",
        msg: "현재 진행중인 물품이 있어 불가합니다"
      });
      return;
    }

    await db.User.update(
      { status: "F", updatedAt: moment().format("YYYY-MM-DD HH:mm:ss") },
      { where: { id: userId } }
    ).catch(err => {
      res.json({
        code: -1,
        data: err,
        msg: "user update err"
      });
    });

    res.json({
      code: 200,
      data: result,
      msg: "user drop success"
    });
  }
}

// user profile account update
async function updateUserAccount(req, res) {
  let bank_code = req.body.bank_code;
  let bank_num = req.body.bank_num;

  try {
    const iamporter = new Iamporter({
      apiKey: iamport_config.iamport_config.apiKey,
      secret: iamport_config.iamport_config.apiSecretKey
    });

    const iamportTokenData = await iamporter.getToken();
    const iamportToken = iamportTokenData.data.access_token;

    const vbanksResult = await axios({
      url: `https://api.iamport.kr/vbanks/holder?bank_code=${bank_code}&bank_num=${bank_num}`,
      headers: {
        Authorization: `Bearer ${iamportToken}`
      }
    });

    // 돌아온 결과가 참인 경우
    if (vbanksResult.data.code == 0) {
      // 성공! 유저 이름과 비교
      let user = await db.User.findOne({ where: { id: req.user.id } });
      let bank_holder = vbanksResult.data.response.bank_holder;

      if (bank_holder == req.user.name) {
        if (!user.bank_tran_id) {
          // console.log("여기는 들어온다~");
          var bank_tran_id = "";
          var bank_tran_verify = true;
          while (bank_tran_verify) {
            bank_tran_id = make_bank_tran_id();
            // console.log(bank_tran_id);
            var result = await db.User.findOne({
              where: { bank_tran_id: bank_tran_id }
            });
            if (!result) {
              bank_tran_verify = false;
            }
          }

          await User.update(
            {
              bank: bank_code,
              bankNum: bank_num,
              bank_tran_id: bank_tran_id,
              updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
            },
            { where: { id: req.user.id } }
          );

          res.json({
            code: 200,
            data: {
              name: bank_holder
            },
            msg: "등록이 완료되었습니다"
          });
        } else {
          await User.update(
            {
              bank: bank_code,
              bankNum: bank_num,
              updatedAt: moment().format("YYYY-MM-DD HH:mm:ss")
            },
            { where: { id: req.user.id } }
          );

          res.json({
            code: 200,
            data: {
              name: bank_holder
            },
            msg: "등록이 완료되었습니다"
          });
        }
      } else {
        res.json({
          code: -1,
          data: "",
          msg: "본인명의 계좌 등록만 가능합니다"
        });
      }
    }
  } catch (err) {
    res.json({
      code: -1,
      data: err,
      msg: err.response.data.message
    });
  }
}

// 유저 정보 가지고 오기 (발송 건수, 운송 건수, 기본 정보)
async function getUserInfo(req, res) {
  //user가 존재하는지 먼저 파악
  let result = await db.User.findOne({ where: { id: req.user.id } });
  let fcm_token = req.headers.fcm_token;
  if (result) {
    if (result.status == "D" || result.status == "F") {
      res.json({
        code: 401,
        data: "",
        msg: "휴면계정 혹은 탈퇴 회원입니다"
      });
      return;
    }

    //start try-catch
    try {
      //user update
      if (result.fcm_token != fcm_token) {
        await db.User.update(
          {
            updatedAt: moment().format("YYYY-MM-DD HH:mm:ss"),
            fcm_token: fcm_token
          },
          { where: { id: req.user.id } }
        );
      } else {
        await db.User.update(
          { updatedAt: moment().format("YYYY-MM-DD HH:mm:ss") },
          { where: { id: req.user.id } }
        );
      }

      let order_result = await db.sequelize.query(
        `select count(*) as count from orders where requestId = ${req.user.id} and status != 'F'`,
        { type: db.sequelize.QueryTypes.SELECT }
      );

      let deliver_result = await db.sequelize.query(
        `select count(*) as count from delivers where delivererId = ${req.user.id} and status != 'F'`,
        { type: db.sequelize.QueryTypes.SELECT }
      );

      let payment_result = await db.Payment.findAll({
        where: { userId: req.user.id },
        order: [["updatedAt", "DESC"]]
      });

      let coupon_result = await db.CouponUsage.findAll({
        where: {
          user_id: req.user.id,
          is_used: 0
        },
        include: [
          {
            model: db.Coupon,
            where: { end_date: { [Op.lt]: moment().format() } }
          }
        ]
      });

      res.json({
        code: 200,
        data: {
          user: result,
          order_result: order_result[0]["count"],
          deliver_result: deliver_result[0]["count"],
          payment_result,
          coupon_result,
          popUp: {
            isTrue: false,
            title: "test",
            content: "https://deliverer.co.kr",
            // content: "https://m.naver.com/",
            image:
              "https://s3.ap-northeast-2.amazonaws.com/deliverer.app/images/deliver/1/11/2_2020-01-11T21%3A59%3A19.308521_deliver.png"
          },
          version: "1.0.0"
        },
        msg: "유저 정보"
      });
    } catch (err) {
      console.log(err);
      res.json({
        code: -1,
        data: err,
        msg: "err"
      });
    }
  } else {
    res.json({
      code: 401,
      data: "",
      msg: "존재하지 않는 유저"
    });
  }
}

// 로그인
async function loginUser(req, res) {
  let email = req.body.email;
  let password = req.body.password;

  try {
    // email 로 user check
    let user_result = await db.User.findOne({ where: { email: email } });
    // user result 의 status 값 구분
    if (user_result) {
      if (user_result.status == "F") {
        res.json({
          code: 600,
          msg: "탈퇴한 회원 고객센터 문의 요망"
        });
      } else if (user_result.status == "D") {
        res.json({
          code: 601,
          msg: "휴면 계정입니다 문의 요청"
        });
      } else {
        let result = bcrypt.compareSync(password, user_result.password);
        if (result) {
          const token = jwt.sign(
            { user: user_result },
            jwt_config.jwt_config.secret,
            { expiresIn: "30 days" }
          );
          await db.User.update(
            {
              updatedAt: moment().format("YYYY-MM-DD HH:mm:ss"),
              fcm_token: req.body.token
            },
            { where: { id: user_result.id } }
          );

          res.json({
            code: 200,
            data: { user: user_result, token }
          });
        } else {
          res.json({
            code: 401,
            msg: "아이디 혹은 비밀번호를 확인해주세요"
          });
        }
      }
    } else {
      res.json({
        code: 404,
        msg: "등록된 유저가 없습니다"
      });
    }
  } catch (err) {}
}

// 회원 가입
async function createUser(req, res) {
  let kind = req.body.kind;
  let email = req.body.email;
  let password = req.body.password;
  let bank = req.body.bank; // 의무아님
  let bankNum = req.body.bankNum; // 의무아님
  let agreementMust = req.body.agreementMust;
  let agreementChoice = req.body.agreementChoice;
  let fcm_token = req.body.fcmToken;

  // 암호화 한 비밀번호
  const salt = bcrypt.genSaltSync(saltRounds);
  password = bcrypt.hashSync(password, salt);

  if (kind == "0") {
    // email이 사용중인지 체크
    let user_email_check_result = await db.User.findOne({
      where: { email: email }
    });

    // 이메일이 있을 경우
    if (user_email_check_result) {
      if (user_email_check_result.status == "F") {
        res.json({
          code: 600,
          data: "",
          msg: "탈퇴한 회원 재가입시 문의 요망"
        });
      } else {
        res.json({
          code: 400,
          data: "",
          msg: "이미 사용중인 이베일입니다 로그인 해 주세요"
        });
      }
      return;
    }

    // 이메일이 없을 경우
    let new_user = await db.User.create({
      email,
      password,
      bank,
      bankNum,
      agreementMust,
      agreementChoice,
      fcm_token
    });

    if (new_user) {
      // 유저 생성 성공하면 jwt token 발행해서 return 해준다
      const token = jwt.sign({ user: new_user }, jwt_config.jwt_config.secret, {
        expiresIn: "30 days"
      });

      res.json({
        code: 200,
        data: { user: new_user, token },
        msg: "로그인 성공"
      });
    }
  }
}

exports.createUser = createUser;
exports.loginUser = loginUser;
exports.getUserInfo = getUserInfo;
exports.updateUserAccount = updateUserAccount;
exports.updateUserImage = updateUserImage;
exports.certificate = certificate;
exports.findEmail = findEmail;
exports.findPassword = findPassword;
exports.newPassword = newPassword;
