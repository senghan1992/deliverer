module.exports = (sequelize, DataTypes) => {
  return sequelize.define("transfer", {
    api_tran_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "거래고유번호"
    },
    rsp_code: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "응답코드"
    },
    rsp_message: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "응답메시지"
    },
    api_tran_dtm: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "거래일시(밀리세컨드)"
    },
    wd_bank_code_std: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "출금기관 은행 표준코드"
    },
    wd_bank_code_sub: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "출금기관 점별코드"
    },
    wd_bank_name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "출금기관명"
    },
    wd_account_num_masked: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "출금계좌번호(출력용)"
    },
    wd_print_content: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "출금계좌인자내역"
    },
    wd_account_holder_name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "송금인 성명"
    },
    res_cnt: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "입금 건수"
    },
    tran_no: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "거래 순번"
    },
    bank_tran_id: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "거래고유번호(참가은행)"
    },
    bank_tran_date: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "거래일자(참가은행)"
    },
    bank_code_tran: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "응답코드를 부여한 참가은행 표준코드"
    },
    bank_rsp_message: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "응답메시지(참가은행)"
    },
    bank_code_std: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "입금(개설)기관.표준코드)"
    },
    bank_code_sub: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "입금(개설)기관.점별코드"
    },
    bank_name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "입금(개설)기관명"
    },
    account_num: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "입금계좌번호"
    },
    account_num_masked: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "입금계좌번호(출력용)"
    },
    print_content: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "입금계좌인자내역"
    },
    tran_amt: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "거래금액"
    },
    account_holder_name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "수취인성명"
    }
  });
};
