const kycService = require('./kyc.service');

const submit = async (req, res) => {
  try {
    const { documentType } = req.body;
    const files = req.files;

    if (!documentType) return res.status(400).json({ success: false, message: 'Document type is required' });
    if (!files?.docImage1?.[0] || !files?.docImage2?.[0] || !files?.facePhoto?.[0] || !files?.signature?.[0]) {
      return res.status(400).json({ success: false, message: 'All 4 files are required: docImage1, docImage2, facePhoto, signature' });
    }

    const result = await kycService.submitKyc(req.user.userId, {
      documentType,
      docImage1Path: files.docImage1[0].path,
      docImage2Path: files.docImage2[0].path,
      facePhotoPath: files.facePhoto[0].path,
      signaturePath: files.signature[0].path,
    });

    res.status(201).json({ success: true, data: result, message: 'KYC submitted successfully. Awaiting admin review.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const status = async (req, res) => {
  try {
    const data = await kycService.getKycStatus(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { submit, status };
