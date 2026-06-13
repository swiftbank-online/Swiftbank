import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function isServiceAccountValid(keyStr: string | undefined): boolean {
  if (!keyStr) return false;
  const trimmed = keyStr.trim();
  if (trimmed === "" || trimmed === "undefined" || trimmed === "null" || trimmed === "PLACEHOLDER") return false;
  try {
    const parsed = JSON.parse(trimmed);
    return !!(parsed && typeof parsed === "object" && (parsed.project_id || parsed.private_key));
  } catch (e) {
    return false;
  }
}

// Lazy-initialized Firestore Admin Reference helper
let adminDb: any = null;
function getAdminDb() {
  if (!adminDb) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!isServiceAccountValid(serviceAccountKey)) {
      return null;
    }
    try {
      const apps = getApps();
      let app;
      if (apps.length === 0) {
        const parsed = JSON.parse(serviceAccountKey!.trim());
        const credential = cert(parsed);
        app = initializeApp({
          credential,
          projectId: parsed.project_id || "swiftbank-b5b56"
        });
      } else {
        app = apps[0];
      }
      adminDb = getFirestore(app);
    } catch (err: any) {
      console.warn("firebase-admin initialization skipped or delayed:", err.message);
      return null;
    }
  }
  return adminDb;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middlewares
  app.use(express.json());

  // Safe Public Profile Lookup by Account Number
  app.get("/api/lookup-account/:accountNumber", async (req: any, res: any) => {
    try {
      const { accountNumber } = req.params;
      if (!accountNumber || accountNumber.length !== 10) {
        return res.status(400).json({ error: "Invalid account number format." });
      }

      const dbAdmin = getAdminDb();
      if (!dbAdmin) {
        return res.status(503).json({ error: "Administrative secure lookup service is currently unavailable. Using client-side synchronization." });
      }
      const usersRef = dbAdmin.collection('users');
      const q = await usersRef.where('accountNumber', '==', accountNumber).get();

      if (q.empty) {
        return res.status(404).json({ error: "Account not found." });
      }

      const userDoc = q.docs[0];
      const userData = userDoc.data();

      if (userData.status !== 'active') {
        return res.status(400).json({ error: "Recipient account is currently inactive." });
      }

      // STRICT PII Isolation: Return only non-sensitive public details
      return res.json({
        userId: userData.userId,
        fullName: userData.fullName,
        accountNumber: userData.accountNumber,
        profileImage: userData.profileImage || "",
      });
    } catch (err: any) {
      console.error("Backend lookup-account exception:", err);
      return res.status(500).json({ error: err.message || "Internal server lookup error" });
    }
  });

  // Secure Server-Side Balance Ledger Transfer Processor
  app.post("/api/execute-transfer", async (req: any, res: any) => {
    try {
      const { senderId, recipientAccountNumber, amountStr, notes, pin } = req.body;
      const amount = parseFloat(amountStr);

      if (!senderId || !recipientAccountNumber || isNaN(amount) || amount <= 0 || !pin) {
        return res.status(400).json({ error: "Invalid request parameters." });
      }

      const dbAdmin = getAdminDb();
      if (!dbAdmin) {
        return res.status(503).json({ error: "Administrative secure transfer service is currently unavailable. Using client-side synchronization." });
      }

      // Find recipient
      const usersRef = dbAdmin.collection('users');
      const recipQuery = await usersRef.where('accountNumber', '==', recipientAccountNumber).get();
      if (recipQuery.empty) {
        return res.status(404).json({ error: "Recipient account could not be found." });
      }

      const recipientDoc = recipQuery.docs[0];
      const recipientData = recipientDoc.data();
      if (recipientData.status !== 'active') {
        return res.status(400).json({ error: "Recipient account is currently inactive." });
      }

      const recipientId = recipientData.userId;

      // Self-transfer guard
      if (senderId === recipientId) {
        return res.status(400).json({ error: "Cannot transfer funds to your own account." });
      }

      const senderDocRef = usersRef.doc(senderId);
      const recipientDocRef = usersRef.doc(recipientId);

      // Generate secure transaction identifiers
      const transactionId = "tx_local_" + Math.random().toString(36).substring(2, 9);
      const debitTxId = transactionId + "_deb";
      const creditTxId = transactionId + "_cred";

      // Read global wire transaction settings
      const settingsSnap = await dbAdmin.collection('settings').doc('global').get();
      const settings = settingsSnap.exists ? settingsSnap.data() : {};
      const minAmt = settings?.minLocalTransfer ?? 10;
      const fee = settings?.localTransferFee ?? 0;

      if (amount < minAmt) {
        return res.status(400).json({ error: `The minimum local transfer amount is $${minAmt.toFixed(2)}.` });
      }

      let resultTx: any = null;

      // Perform transaction under fully protective ACID database guarantees
      await dbAdmin.runTransaction(async (transaction: any) => {
        const senderSnap = await transaction.get(senderDocRef);
        if (!senderSnap.exists) {
          throw new Error("Sender account does not exist.");
        }
        const senderData = senderSnap.data();

        if (senderData.pin !== pin) {
          throw new Error("Invalid 4-digit transaction PIN security authorization.");
        }
        if (senderData.status !== 'active') {
          throw new Error("Your account has been restricted.");
        }

        const totalDebit = amount + fee;
        if (senderData.balance < totalDebit) {
          throw new Error(`Insufficient account balance. Required: $${totalDebit.toFixed(2)} (includes $${fee.toFixed(2)} processing fee).`);
        }

        // Fraud detection checks
        const txsRef = dbAdmin.collection('transactions');
        const txSnap = await txsRef.where('userId', '==', senderId).get();
        const txlist: any[] = [];
        txSnap.forEach((d: any) => txlist.push(d.data()));
        const transferCount = txlist.filter((t: any) => t.type === 'local_transfer' || t.type === 'intl_transfer').length;

        if (senderData.restrictActive && senderData.restrictTransferIndex === (transferCount + 1)) {
          throw new Error(`RESTRICTED_TRANSFER:${senderData.restrictMessage || "Fraudulent transfers restricted to secure client funds."}`);
        }

        const currentRecipientSnap = await transaction.get(recipientDocRef);
        if (!currentRecipientSnap.exists) {
          throw new Error("Recipient account does not exist.");
        }
        const currentRecipientData = currentRecipientSnap.data();

        // Increment and decrement account ledgers atomically
        transaction.update(senderDocRef, { balance: senderData.balance - totalDebit });
        transaction.update(recipientDocRef, { balance: currentRecipientData.balance + amount });

        // Submit matching double-ledger financial transactions
        const debitTx = {
          id: debitTxId,
          userId: senderId,
          type: 'local_transfer',
          amount,
          fee,
          status: 'approved',
          senderName: senderData.fullName,
          recipientName: currentRecipientData.fullName,
          senderImage: senderData.profileImage || "",
          recipientImage: currentRecipientData.profileImage || "",
          recipientAccount: recipientAccountNumber,
          notes: fee > 0 ? `Sent: ${notes} (Fee: $${fee.toFixed(2)})` : `Sent: ${notes}`,
          createdAt: new Date().toISOString()
        };

        const creditTx = {
          id: creditTxId,
          userId: recipientId,
          type: 'local_transfer',
          amount,
          fee: 0,
          status: 'approved',
          senderName: senderData.fullName,
          recipientName: currentRecipientData.fullName,
          senderImage: senderData.profileImage || "",
          recipientImage: currentRecipientData.profileImage || "",
          recipientAccount: recipientAccountNumber,
          notes: `Received: ${notes}`,
          createdAt: new Date().toISOString()
        };

        transaction.set(txsRef.doc(debitTxId), debitTx);
        transaction.set(txsRef.doc(creditTxId), creditTx);

        // Submit client warnings/notification logs
        const notifsRef = dbAdmin.collection('notifications');
        const sNotifId = "notif_" + Math.random().toString(36).substring(2, 9);
        const rNotifId = "notif_" + Math.random().toString(36).substring(2, 9);

        transaction.set(notifsRef.doc(sNotifId), {
          id: sNotifId,
          userId: senderId,
          title: "Transfer Sent",
          message: `Your wire transfer of $${amount.toFixed(2)} to account ${recipientAccountNumber} was approved and processed successfully.`,
          createdAt: new Date().toISOString(),
          read: false
        });

        transaction.set(notifsRef.doc(rNotifId), {
          id: rNotifId,
          userId: recipientId,
          title: "Transfer Received",
          message: `You received an instant wire transfer of $${amount.toFixed(2)} from ${senderData.fullName}.`,
          createdAt: new Date().toISOString(),
          read: false
        });

        resultTx = debitTx;
      });

      return res.json({ success: true, transaction: resultTx });
    } catch (err: any) {
      console.error("Backend execute-transfer exception:", err);
      return res.status(400).json({ error: err.message || "Dynamic wire transfer processor failed." });
    }
  });

  // Cloudinary upload endpoint
  const storage = multer.memoryStorage();
  const upload = multer({ storage });

  app.post("/api/upload", upload.single("file"), (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded." });
      }

      const stream = cloudinary.uploader.upload_stream(
        { folder: "swiftbank_profiles" },
        (error, result) => {
          if (error) {
            console.error("Cloudinary error:", error);
            return res.status(500).json({ error: error.message || "Cloudinary upload failed" });
          }
          return res.json({ url: result?.secure_url });
        }
      );

      stream.end(req.file.buffer);
    } catch (err: any) {
      console.error("Server upload exception:", err);
      return res.status(500).json({ error: err.message || "Internal server upload exception" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME });
  });

  // Vite middleware for development vs static serve for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
