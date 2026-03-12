from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import datetime
import os
import hashlib
import dj_database_url
from contextlib import contextmanager
from dotenv import load_dotenv

# Load environment variables from .env file for local development
load_dotenv()

app = FastAPI()

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL")
IS_POSTGRES = DATABASE_URL is not None and DATABASE_URL.startswith("postgres")

def get_placeholder():
    return "%s" if IS_POSTGRES else "?"

@contextmanager
def get_db():
    if IS_POSTGRES:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        conn = psycopg2.connect(DATABASE_URL, sslmode="require")
        try:
            # We use RealDictCursor for Postgres to match sqlite3.Row behavior
            yield conn, conn.cursor(cursor_factory=RealDictCursor)
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    else:
        conn = sqlite3.connect("expenses.db")
        conn.row_factory = sqlite3.Row
        try:
            yield conn, conn.cursor()
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

def init_db():
    p = get_placeholder()
    with get_db() as (conn, cursor):
        # Create expenses table
        if IS_POSTGRES:
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS expenses (
                    id SERIAL PRIMARY KEY,
                    timestamp TEXT NOT NULL,
                    year INTEGER NOT NULL,
                    month INTEGER NOT NULL,
                    shop TEXT NOT NULL,
                    amount REAL NOT NULL,
                    category TEXT NOT NULL,
                    username TEXT DEFAULT 'default_user'
                )
            ''')
            # Create users table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL
                )
            ''')
        else:
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS expenses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    year INTEGER NOT NULL,
                    month INTEGER NOT NULL,
                    shop TEXT NOT NULL,
                    amount REAL NOT NULL,
                    category TEXT NOT NULL
                )
            ''')
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL
                )
            ''')
            # Alter expenses table to add username column if it doesn't exist
            try:
                cursor.execute("ALTER TABLE expenses ADD COLUMN username TEXT DEFAULT 'default_user'")
            except sqlite3.OperationalError:
                pass 

# Initialize DB on startup
init_db()

@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# Allow CORS if needed
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class ExpenseCreate(BaseModel):
    username: str
    year: int
    month: int
    shop: str
    amount: float
    category: str

@app.post("/api/register")
def register_user(user: UserCreate):
    try:
        p = get_placeholder()
        with get_db() as (conn, cursor):
            # Check if username exists
            cursor.execute(f"SELECT id FROM users WHERE username = {p}", (user.username,))
            if cursor.fetchone():
                return JSONResponse(content={"status": "error", "message": "Username already exists"}, status_code=400)
                
            cursor.execute(f"INSERT INTO users (username, password_hash) VALUES ({p}, {p})", 
                           (user.username, hash_password(user.password)))
            
        return JSONResponse(content={"status": "success", "message": "User registered successfully"})
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

@app.post("/api/login")
def login_user(user: UserLogin):
    try:
        p = get_placeholder()
        with get_db() as (conn, cursor):
            cursor.execute(f"SELECT password_hash FROM users WHERE username = {p}", (user.username,))
            row = cursor.fetchone()
            
        if not row or row[0 if not IS_POSTGRES else "password_hash"] != hash_password(user.password):
            return JSONResponse(content={"status": "error", "message": "Invalid username or password"}, status_code=401)
            
        return JSONResponse(content={"status": "success", "message": "Login successful", "username": user.username})
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

@app.get("/api/expenses")
def get_expenses(username: str, year: int = None, month: int = None):
    if not username:
        return JSONResponse(content={"status": "error", "message": "Username is required"}, status_code=400)
        
    try:
        p = get_placeholder()
        with get_db() as (conn, cursor):
            query = f"SELECT * FROM expenses WHERE username = {p}"
            params = [username]
            
            if year:
                query += f" AND year = {p}"
                params.append(year)
            if month:
                query += f" AND month = {p}"
                params.append(month)
                
            cursor.execute(query, tuple(params))
            rows = cursor.fetchall()
            
            expenses = []
            for row in rows:
                expenses.append({
                    "id": row["id"],
                    "timestamp": row["timestamp"],
                    "year": row["year"],
                    "month": row["month"],
                    "shop": row["shop"],
                    "amount": row["amount"],
                    "category": row["category"]
                })
                
        return JSONResponse(content={"status": "success", "data": expenses})
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

@app.post("/api/expenses")
def add_expense(expense: ExpenseCreate):
    try:
        p = get_placeholder()
        timestamp = datetime.datetime.now().isoformat()
        
        with get_db() as (conn, cursor):
            cursor.execute(f'''
                INSERT INTO expenses (timestamp, year, month, shop, amount, category, username)
                VALUES ({p}, {p}, {p}, {p}, {p}, {p}, {p})
            ''', (timestamp, expense.year, expense.month, expense.shop, expense.amount, expense.category, expense.username))
        
        return JSONResponse(content={"status": "success", "message": "Expense added successfully"})
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

@app.delete("/api/expenses/{expense_id}")
def delete_expense(expense_id: int, username: str):
    if not username:
        return JSONResponse(content={"status": "error", "message": "Username is required"}, status_code=400)
        
    try:
        p = get_placeholder()
        with get_db() as (conn, cursor):
            # Check if exists and belongs to user
            cursor.execute(f"SELECT id FROM expenses WHERE id = {p} AND username = {p}", (expense_id, username))
            if not cursor.fetchone():
                return JSONResponse(content={"status": "error", "message": "Expense not found or unauthorized"}, status_code=404)
                
            # Delete row
            cursor.execute(f"DELETE FROM expenses WHERE id = {p} AND username = {p}", (expense_id, username))
            
        return JSONResponse(content={"status": "success", "message": "Expense deleted successfully"})
    except Exception as e:
        return JSONResponse(content={"status": "error", "message": str(e)}, status_code=500)

# Serve the static files
app.mount("/", StaticFiles(directory=".", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    print(f"Starting server in {'PostgreSQL' if IS_POSTGRES else 'SQLite'} mode")
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
