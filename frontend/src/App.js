import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { Protected } from "@/components/Layout";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import Library from "@/pages/Library";
import BookDetail from "@/pages/BookDetail";
import UploadBook from "@/pages/UploadBook";
import Clubs from "@/pages/Clubs";
import ClubDetail from "@/pages/ClubDetail";
import DiscussionDetail from "@/pages/DiscussionDetail";
import ChessGame from "@/pages/ChessGame";
import Events from "@/pages/Events";
import EventDetail from "@/pages/EventDetail";
import Competitions from "@/pages/Competitions";
import Tournaments from "@/pages/Tournaments";
import CompetitionDetail from "@/pages/CompetitionDetail";
import Leaderboard from "@/pages/Leaderboard";
import Profile from "@/pages/Profile";
import News from "@/pages/News";
import Admin from "@/pages/Admin";

function App() {
  useEffect(() => {
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
  }, []);
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/library" element={<Library />} />
          <Route path="/books/:id" element={<BookDetail />} />
          <Route path="/upload-book" element={<Protected><UploadBook /></Protected>} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/clubs/:slug" element={<ClubDetail />} />
          <Route path="/discussions/:id" element={<DiscussionDetail />} />
          <Route path="/chess/:id" element={<Protected><ChessGame /></Protected>} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/competitions" element={<Competitions />} />
          <Route path="/competitions/:id" element={<CompetitionDetail />} />
 <Route path="/tournaments" element={<Tournaments />} />
 <Route path="/tournaments/:id" element={<Tournaments />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/news" element={<News />} />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/admin/*" element={<Protected staff><Admin /></Protected>} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}

export default App;
