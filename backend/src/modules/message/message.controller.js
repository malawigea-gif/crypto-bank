const messageService = require('./message.service');

const send = async (req, res) => {
  try {
    const msg = await messageService.sendUserMessage(req.user.userId, req.body.body);
    res.status(201).json({ success: true, data: msg });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const thread = async (req, res) => {
  try {
    const msgs = await messageService.getUserThread(req.user.userId);
    res.json({ success: true, data: msgs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const adminList = async (req, res) => {
  try {
    const data = await messageService.listUserThreads();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const adminThread = async (req, res) => {
  try {
    const data = await messageService.getAdminThread(req.params.userId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const adminReply = async (req, res) => {
  try {
    const msg = await messageService.sendAdminMessage(req.params.userId, req.body.body);
    res.status(201).json({ success: true, data: msg });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = { send, thread, adminList, adminThread, adminReply };
