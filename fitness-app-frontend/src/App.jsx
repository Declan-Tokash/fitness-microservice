import { Button } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "react-oauth2-code-pkce";
import { useDispatch } from "react-redux";
import { createBrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router";
import { setCredentails } from "./store/authSlice";

function App() {

  const {token, tokenData, logIn, logOut, isAuthenticated} = useContext(AuthContext);
  const dispatch = useDispatch();
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    if(token && tokenData) {
      dispatch(setCredentails({
        user: tokenData,
        token: token,
      }));
      setAuthReady(true);
    }
  }, [token, tokenData, dispatch]);

  return (
    <div>
      {!token ? (
        <Button variant="contained" color="primary" onClick={() => {logIn()}}> 
          Login
        </Button>
      ) : (
        <div>
          <pre>
            {JSON.stringify(tokenData, null, 2)}
            {JSON.stringify(token, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App
