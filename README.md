# Hannan Avtor Backend - Professional Social Network & Calling API

<p align="center">
  <img src="assets/banner.svg" alt="hannanavtor-backend Banner" width="100%">
</p>

<p align="center">
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-20.x-green?style=for-the-badge&logo=node.js" alt="Node.js"></a>
  <a href="https://expressjs.com"><img src="https://img.shields.io/badge/Express-4.21-black?style=for-the-badge&logo=express" alt="Express"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"></a>
  <a href="https://www.prisma.io"><img src="https://img.shields.io/badge/Prisma-6.x-2D3748?style=for-the-badge&logo=prisma" alt="Prisma"></a>
  <a href="https://www.mongodb.com"><img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB"></a>
  <a href="https://agora.io"><img src="https://img.shields.io/badge/Agora_RTC-099DFD?style=for-the-badge" alt="Agora RTC"></a>
  <a href="https://stripe.com"><img src="https://img.shields.io/badge/Stripe-635BFF?style=for-the-badge&logo=stripe" alt="Stripe"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-ISC-blue?style=for-the-badge" alt="License"></a>
</p>

---

## 📖 Overview

**hannanavtor-backend** is a social professional networking and creator collaboration API built with Node.js, Express.js, TypeScript, and Prisma ORM with MongoDB. It features interactive community discussion feeds, peer-to-peer connection requests, direct messaging, referral incentive tracking, Agora RTC audio/video calling tokens, and Stripe creator payouts.

---

## ⚡ Key Features

- 🌐 **Community Social Feeds:** User posts, engagement reactions, comment threads, and topic categorization.
- 👥 **Professional Peer Connections:** Connection request lifecycle, reciprocal followings, and contact discovery.
- 📞 **Agora WebRTC Audio/Video Tokens:** Dynamic RTC token generation for private 1-on-1 and group video/audio calls.
- 🎁 **Referral Reward Architecture:** Unique user referral codes tracking network growth, bonus balances, and commission payouts.
- 💳 **Stripe Creator Payouts:** Direct integration with Stripe Connect for balance withdrawal and creator tips.
- 🔔 **Firebase Cloud Messaging:** Instant real-time alerts for incoming calls, connection invites, and discussion replies.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    User[Professional Network Members] -->|HTTPS REST| Router[Express Application Gateway]

    subgraph Security ["Security & Auth"]
        Router --> Auth[JWT Role Guard]
        Router --> RateLimit[API Rate Limiter]
    end

    subgraph SocialNetwork ["Community Modules"]
        Auth --> CommunityMod[Community Feeds & Posts]
        Auth --> ConnectMod[Connection Requests & Graph]
        Auth --> MessageMod[Direct Messaging Service]
        Auth --> ReferralMod[Referral Reward Tracking]
    end

    subgraph RTCAndPayments ["Real-Time & Creator Economy"]
        Auth --> Agora[Agora WebRTC Token Engine]
        Auth --> Stripe[Stripe Connect Payouts]
    end

    subgraph Persistence ["Persistence & CDN"]
        SocialNetwork --> Prisma[Prisma ORM Client]
        Prisma --> MongoDB[(MongoDB Cluster)]
        SocialNetwork --> DOSpaces[DigitalOcean Spaces S3]
    end
```

---

## 📂 Directory Structure

```text
.
├── src/
│   ├── app/
│   ├── components/
│   └── ...
├── assets/
│   └── banner.svg
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── LICENSE
```

---

## 🛠️ Tech Stack & Dependencies

| Layer / Library | Version | Description |
|---|---|---|
| **Express.js** | `v4.21` | HTTP routing and middleware framework |
| **TypeScript** | `v5.x` | Type safety across API entities |
| **Prisma ORM** | `v6.x` | MongoDB modeling and query construction |
| **Agora RTC SDK** | `REST` | WebRTC token generation for live calls |
| **Stripe SDK** | `v17.x` | Creator economy and payout disbursements |
| **AWS SDK (S3 Client)** | `v3.x` | DigitalOcean Spaces file storage integration |

---

## ⚙️ Environment Variables

Create a `.env` file in the project root based on the provided sample:

```bash
cp .env.example .env
```

Configurable variables:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/hannanavtor?retryWrites=true&w=majority

JWT_SECRET=your_jwt_secret
EXPIRES_IN=15d

# Agora RTC
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate

# Stripe
STRIPE_PK=pk_test_your_stripe_public_key
STRIPE_SK=sk_test_your_stripe_secret_key

# DigitalOcean Spaces
DO_SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
DO_SPACES_KEY=your_do_spaces_key
DO_SPACES_SECRET=your_do_spaces_secret
DO_SPACES_BUCKET=hannanavtor-media
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v20.x or higher recommended)
- Package Manager (`npm`, `yarn`, or `pnpm`)

### Installation

```bash
# Clone repository
git clone https://github.com/shahjalal-labs/hannanavtor-backend.git
cd hannanavtor-backend

# Install dependencies
npm install
```

### Running Locally

```bash
# Start development server
npm run dev
# or for backend services
npm run start:dev
```

### Building for Production

```bash
# Create production build
npm run build

# Start production server
npm start
```

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
