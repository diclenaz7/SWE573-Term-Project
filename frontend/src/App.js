import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./screens/Login";
import Register from "./screens/Register";
import Home from "./screens/Home";
import CreateOffer from "./screens/CreateOffer";
import CreateNeed from "./screens/CreateNeed";
import NeedDetail from "./screens/NeedDetail";
import OfferDetail from "./screens/OfferDetail";
import Profile from "./screens/Profile";
import People from "./screens/People";
import Messages from "./screens/Messages";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<Home />} />
          <Route path="/create-offer" element={<CreateOffer />} />
          <Route path="/create-need" element={<CreateNeed />} />
          <Route path="/needs/:id" element={<NeedDetail />} />
          <Route path="/offers/:id" element={<OfferDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/people" element={<People />} />
          <Route path="/messages" element={<Messages />} />
          {/* <Route path="*" element={<Navigate to="/" replace />} /> */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
