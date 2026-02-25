import { apiResponse } from "../../utils/apiResponse.js";
import { asyncHandler } from "../../utils/asynchandler.js";



const getInstallmentPeriods = asyncHandler(async (req, res) => {
  const { installmentType } = req.params;

  const periods = INSTALLMENT_PERIODS[installmentType];

  if (!periods) {
    return res
      .status(400)
      .json(new apiResponse(400, null, "Invalid installment type"));
  }

  res.status(200).json(
    new apiResponse(200, {
      installmentType,
      totalInstallments: periods.length,
      periods,
    })
  );
});

export { getInstallmentPeriods };