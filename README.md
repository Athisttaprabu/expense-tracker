# 💰 Premium Expense Tracker

A beautiful, responsive, and secure expense tracking application built with **FastAPI**, **SQLite**, and **Vanilla JavaScript**.

![Demo](https://via.placeholder.com/800x450.png?text=Expense+Tracker+Dashboard)

## ✨ Features

- **Modern UI**: Sleek dark theme with "Glassmorphism" aesthetics.
- **Responsive Design**: Optimized for both Desktop and Mobile views.
- **Secure Authentication**: Built-in user registration and login system with hashed passwords.
- **Interactive Charts**: Dynamic spending overview powered by Chart.js.
- **Data Persistence**: Local SQLite database to keep your data private and portable.
- **Smart Filtering**: Filter expenses by Year and Month.
- **Custom Categories**: Add your own categories on the fly.

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- Git

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/expense-tracker.git
   cd expense-tracker
   ```

2. **Set up a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**:
   ```bash
   python main.py
   ```
   The app will be available at [http://localhost:8000](http://localhost:8000).

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL (Supabase) / SQLite (Local)
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **Charts**: Chart.js
- **Icons**: FontAwesome

## 🌐 Deployment & Database Persistence

To ensure your data is persistent across server restarts (especially on Render):

### 1. PostgreSQL Setup (Supabase)
1. Create a [Supabase](https://supabase.com/) account and a new project.
2. In your Supabase dashboard, go to **Project Settings > Database** and copy your **URI** connection string.
3. Replace `[YOUR-PASSWORD]` with your actual database password.

### 2. Configure Environment Variables
- **On Render**: Go to your service's **Environment** tab and add a new secret:
  - Key: `DATABASE_URL`
  - Value: `postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres`
- **Locally**: Create a `.env` file in the root directory and add:
  ```env
  DATABASE_URL=your-supabase-connection-string
  ```

### 3. Automatic Detection
The application is designed to automatically detect the `DATABASE_URL`. If it's present, it will use PostgreSQL; otherwise, it defaults to local SQLite (`expenses.db`).

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
