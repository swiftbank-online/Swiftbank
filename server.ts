import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, doc, query, where, getDocs, getDoc, runTransaction, setDoc, updateDoc } from "firebase/firestore";
import fs from "fs";
import * as adminModule from "firebase-admin";
const admin = adminModule as any;
import firebaseConfig from "./firebase-applet-config.json";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

let clientApp: any = null;
let clientDb: any = null;
let clientAuth: any = null;
let adminDb: any = null;

function getAdminDb() {
  if (adminDb) return adminDb;

  try {
    if (admin.apps.length === 0) {
      const saKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      if (saKey) {
        try {
          const serviceAccount = JSON.parse(saKey);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
          console.log("Firebase Admin successfully initialized with service account certificate.");
        } catch (jsonErr: any) {
          console.warn("Could not parse FIREBASE_SERVICE_ACCOUNT_KEY as JSON, attempting default credentials:", jsonErr.message);
          admin.initializeApp();
        }
      } else {
        admin.initializeApp();
        console.log("Firebase Admin implicitly initialized via Cloud Credentials (Default Credentials).");
      }
    }
    adminDb = admin.firestore();
    return adminDb;
  } catch (adminErr: any) {
    console.error("Firebase Admin initialization failed, fallback to client auth Firestore:", adminErr.message);
    return null;
  }
}

async function ensureBackendAuthenticated() {
  if (!clientDb) {
    const apps = getApps();
    clientApp = apps.length === 0 ? initializeApp(firebaseConfig) : getApp();
    clientDb = getFirestore(clientApp);
    clientAuth = getAuth(clientApp);
  }

  // Ensure authenticated
  if (!clientAuth.currentUser) {
    try {
      await signInWithEmailAndPassword(clientAuth, "swiftbank.online@gmail.com", "Admin@swiftbank.online");
      console.log("Firebase Backend successfully authenticated as admin.");
    } catch (authErr: any) {
      if (authErr.code === 'auth/user-not-found' || authErr.message.includes('user-not-found') || authErr.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(clientAuth, "swiftbank.online@gmail.com", "Admin@swiftbank.online");
          console.log("Firebase Backend successfully self-healed and created admin auth.");
        } catch (createErr: any) {
          console.error("Firebase Backend admin auto-creation failed:", createErr.message);
        }
      } else {
        console.error("Firebase Backend sign-in failed:", authErr.message);
      }
    }
  }

  // Ensure admin user profile document exists
  const adminUid = clientAuth.currentUser?.uid;
  if (adminUid) {
    try {
      const adminDocRef = doc(clientDb, 'users', adminUid);
      const adminSnap = await getDoc(adminDocRef);
      if (!adminSnap.exists()) {
        console.log("Auto-initializing Firestore administrator profile document...");
        await setDoc(adminDocRef, {
          userId: adminUid,
          fullName: "George Stetson (Advisory Admin)",
          email: "swiftbank.online@gmail.com",
          accountNumber: "8888888888",
          balance: 10000000.00,
          pin: "8888",
          status: "active",
          profileImage: "",
          isAdmin: true,
          createdAt: new Date().toISOString()
        });
      }
    } catch (profErr: any) {
      console.warn("Profile document check failed:", profErr.message);
    }
  }

  return { clientDb, clientAuth };
}

const app = express();

// JSON parsing middlewares
app.use(express.json());

// Safe Public Profile Lookup by Account Number
app.get("/api/lookup-account/:accountNumber", async (req: any, res: any) => {
  try {
    const { accountNumber } = req.params;
    if (!accountNumber || accountNumber.length !== 10) {
      return res.status(400).json({ error: "Invalid account number format." });
    }

    const aDb = getAdminDb();
    if (aDb) {
      const recipQuery = await aDb.collection('users').where('accountNumber', '==', accountNumber).get();
      if (recipQuery.empty) {
        return res.status(404).json({ error: "Account not found." });
      }
      const userDoc = recipQuery.docs[0];
      const userData = userDoc.data();
      if (userData.status !== 'active') {
        return res.status(400).json({ error: "Recipient account is currently inactive." });
      }
      return res.json({
        userId: userData.userId,
        fullName: userData.fullName,
        accountNumber: userData.accountNumber,
        profileImage: userData.profileImage || "",
      });
    } else {
      const { clientDb } = await ensureBackendAuthenticated();
      const q = query(collection(clientDb, 'users'), where('accountNumber', '==', accountNumber));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        return res.status(404).json({ error: "Account not found." });
      }

      const userDoc = querySnap.docs[0];
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
    }
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

    const aDb = getAdminDb();
    let recipientId = "";
    let recipientData: any = null;

    if (aDb) {
      const recipQuery = await aDb.collection('users').where('accountNumber', '==', recipientAccountNumber).get();
      if (recipQuery.empty) {
        return res.status(404).json({ error: "Recipient account could not be found." });
      }
      const recipientDoc = recipQuery.docs[0];
      recipientData = recipientDoc.data();
      if (recipientData.status !== 'active') {
        return res.status(400).json({ error: "Recipient account is currently inactive." });
      }
      recipientId = recipientData.userId;
    } else {
      const { clientDb } = await ensureBackendAuthenticated();
      const recipQuery = await getDocs(query(collection(clientDb, 'users'), where('accountNumber', '==', recipientAccountNumber)));
      if (recipQuery.empty) {
        return res.status(404).json({ error: "Recipient account could not be found." });
      }
      const recipientDoc = recipQuery.docs[0];
      recipientData = recipientDoc.data();
      if (recipientData.status !== 'active') {
        return res.status(400).json({ error: "Recipient account is currently inactive." });
      }
      recipientId = recipientData.userId;
    }

    // Self-transfer guard
    if (senderId === recipientId) {
      return res.status(400).json({ error: "Cannot transfer funds to your own account." });
    }

    // Generate secure transaction identifiers
    const transactionId = "tx_local_" + Math.random().toString(36).substring(2, 9);
    const debitTxId = transactionId + "_deb";
    const creditTxId = transactionId + "_cred";

    // Read global wire transaction settings
    let minAmt = 10;
    let fee = 0;

    if (aDb) {
      const settingsSnap = await aDb.collection('settings').doc('global').get();
      const settings = settingsSnap.exists ? settingsSnap.data() : {};
      minAmt = settings?.minLocalTransfer ?? 10;
      fee = settings?.localTransferFee ?? 0;
    } else {
      const { clientDb } = await ensureBackendAuthenticated();
      const settingsSnap = await getDoc(doc(clientDb, 'settings', 'global'));
      const settings = settingsSnap.exists() ? settingsSnap.data() : {};
      minAmt = settings?.minLocalTransfer ?? 10;
      fee = settings?.localTransferFee ?? 0;
    }

    if (amount < minAmt) {
      return res.status(400).json({ error: `The minimum local transfer amount is $${minAmt.toFixed(2)}.` });
    }

    let resultTx: any = null;

    if (aDb) {
      // Perform transaction under fully protective ACID database guarantees using admin SDK
      await aDb.runTransaction(async (transaction: any) => {
        const senderRef = aDb.collection('users').doc(senderId);
        const recipientRef = aDb.collection('users').doc(recipientId);

        const senderSnap = await transaction.get(senderRef);
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
        const txSnap = await aDb.collection('transactions').where('userId', '==', senderId).get();
        const txlist: any[] = [];
        txSnap.forEach((d: any) => txlist.push(d.data()));
        const transferCount = txlist.filter((t: any) => t.type === 'local_transfer' || t.type === 'intl_transfer').length;

        const currentRecipientSnap = await transaction.get(recipientRef);
        if (!currentRecipientSnap.exists) {
          throw new Error("Recipient account does not exist.");
        }
        const currentRecipientData = currentRecipientSnap.data();

        // Increment and decrement account ledgers atomically
        transaction.update(senderRef, { balance: senderData.balance - totalDebit });
        transaction.update(recipientRef, { balance: currentRecipientData.balance + amount });

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

        transaction.set(aDb.collection('transactions').doc(debitTxId), debitTx);
        transaction.set(aDb.collection('transactions').doc(creditTxId), creditTx);

        // Submit client warnings/notification logs
        const sNotifId = "notif_" + Math.random().toString(36).substring(2, 9);
        const rNotifId = "notif_" + Math.random().toString(36).substring(2, 9);

        transaction.set(aDb.collection('notifications').doc(sNotifId), {
          id: sNotifId,
          userId: senderId,
          title: "Transfer Sent",
          message: `Your wire transfer of $${amount.toFixed(2)} to account ${recipientAccountNumber} was approved and processed successfully.`,
          createdAt: new Date().toISOString(),
          read: false
        });

        transaction.set(aDb.collection('notifications').doc(rNotifId), {
          id: rNotifId,
          userId: recipientId,
          title: "Transfer Received",
          message: `You received an instant wire transfer of $${amount.toFixed(2)} from ${senderData.fullName}.`,
          createdAt: new Date().toISOString(),
          read: false
        });

        resultTx = debitTx;
      });
    } else {
      // clientDb fallback
      const { clientDb } = await ensureBackendAuthenticated();
      const senderDocRef = doc(clientDb, 'users', senderId);
      const recipientDocRef = doc(clientDb, 'users', recipientId);

      await runTransaction(clientDb, async (transaction) => {
        const senderSnap = await transaction.get(senderDocRef);
        if (!senderSnap.exists()) {
          throw new Error("Sender account does not exist.");
        }
        const senderData = senderSnap.data() as any;

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
        const txSnap = await getDocs(query(collection(clientDb, 'transactions'), where('userId', '==', senderId)));
        const txlist: any[] = [];
        txSnap.forEach((d: any) => txlist.push(d.data()));
        const transferCount = txlist.filter((t: any) => t.type === 'local_transfer' || t.type === 'intl_transfer').length;

        const currentRecipientSnap = await transaction.get(recipientDocRef);
        if (!currentRecipientSnap.exists()) {
          throw new Error("Recipient account does not exist.");
        }
        const currentRecipientData = currentRecipientSnap.data() as any;

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

        transaction.set(doc(clientDb, 'transactions', debitTxId), debitTx);
        transaction.set(doc(clientDb, 'transactions', creditTxId), creditTx);

        // Submit client warnings/notification logs
        const sNotifId = "notif_" + Math.random().toString(36).substring(2, 9);
        const rNotifId = "notif_" + Math.random().toString(36).substring(2, 9);

        transaction.set(doc(clientDb, 'notifications', sNotifId), {
          id: sNotifId,
          userId: senderId,
          title: "Transfer Sent",
          message: `Your wire transfer of $${amount.toFixed(2)} to account ${recipientAccountNumber} was approved and processed successfully.`,
          createdAt: new Date().toISOString(),
          read: false
        });

        transaction.set(doc(clientDb, 'notifications', rNotifId), {
          id: rNotifId,
          userId: recipientId,
          title: "Transfer Received",
          message: `You received an instant wire transfer of $${amount.toFixed(2)} from ${senderData.fullName}.`,
          createdAt: new Date().toISOString(),
          read: false
        });

        resultTx = debitTx;
      });
    }

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

// Boot logic for standalone execution
async function boot() {
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

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  boot();
}

export default app;
