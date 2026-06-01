import "dotenv/config";
import app from "./app.js";
import { startWhatsAppSchedulers } from "./services/whatsappScheduler.js";

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`JobFlow API running on port ${port}`);
  startWhatsAppSchedulers();
});
