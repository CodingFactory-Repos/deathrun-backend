
# Deathrun Game - Backend

This repository contains the backend services for the Deathrun Game, built using Socket.io and Express.JS.

## Installation

To install and run the backend locally, follow these steps:

1. Clone the repository:
   ```
   git clone https://github.com/CodingFactory-Repos/deathrun-backend.git
   ```

2. Navigate to the project directory:
   ```
   cd deathrun-backend
   ```

3. Install the dependencies using pnpm:
   ```
   pnpm install
   ```

4. Start the server:
   ```
   pnpm start
   ```

5. The backend server will run on `http://localhost:4000`.

## Project Overview

The backend manages real-time communication between the player and the trap setter, ensuring synchronized gameplay.

### Key Features:
- **Real-time Communication:** Supports player and trap setter interaction via WebSockets.
- **Multiplayer Support:** Allows multiple players and trap setters to participate simultaneously.

## Technologies Used

- Socket.io
- Express.JS
- pnpm (package management)
