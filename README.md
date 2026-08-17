# MediVault AI

Build a Patient-Owned Medical Locker app called 'MediVault AI'.

Core Architecture (Patient Side):

User Role: The primary user is the 'Patient'.

Profile Management: Allow a user to create a 'Primary Profile' for themselves and 'Sub-Profiles' for family members.

Smart Upload: A private vault for each profile where they upload prescriptions and lab reports. Use AI to extract medications, dates, and health values into a private 'Health Timeline'.

Self-Diagnosis Tool: A feature where the patient inputs symptoms. The AI cross-references these with their uploaded history to provide a triage summary (e.g., 'Your history of BP suggests you should see a doctor for this headache').

Doctor Access Logic (Security):

Access Control: All data is private to the patient by default.

'Share with Doctor' Feature: Create a button that generates a temporary 'Access Link' or a 'QR Code'. When clicked, it grants a doctor view-only access to specific documents for a limited time (e.g., 24 hours).

Doctor View: Create a simplified 'Doctor Dashboard' that only shows the summarized AI insights and the specific files shared by the patient.

UI Design:

The patient home screen should focus on 'My Health' and 'Upload New Doc'.

Use a clean, trustworthy medical-blue theme. Make it very simple for non-technical users

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://medilocker-ai-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2dd6ec86-b221-46b7-b267-bac316b6f180).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
