# WebSocket Production Fix

## Changes Made

### 1. Updated Dockerfile
- **Changed from**: `gunicorn` (WSGI-only, no WebSocket support)
- **Changed to**: `daphne` (ASGI server with WebSocket support)
- **File**: `Dockerfile`
- **Line 26**: Changed CMD to use `daphne -b 0.0.0.0 -p $PORT appsite.asgi:application`

### 2. Updated ALLOWED_HOSTS
- Added frontend domain for WebSocket origin validation
- **File**: `appsite/settings.py`
- Added: `react-frontend-gkihzbtmca-ew.a.run.app` and other Cloud Run URLs

### 3. Updated CORS Settings
- Added frontend URL to `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`
- **File**: `appsite/settings.py`

## Why This Was Needed

1. **Gunicorn doesn't support WebSockets**: Gunicorn is a WSGI server that only handles HTTP requests. WebSockets require an ASGI server like Daphne.

2. **Origin Validation**: The `AllowedHostsOriginValidator` in ASGI checks the Origin header against `ALLOWED_HOSTS`. The frontend domain needed to be added.

3. **CORS**: The frontend needs to be in the CORS allowed origins for WebSocket connections.

## Verification

After deployment, verify WebSocket is working:

1. Check backend logs show daphne starting:
   ```bash
   gcloud run services logs read django-app --region=europe-west1
   ```
   Look for: `Starting server at tcp:port=8000:interface=0.0.0.0`

2. Test WebSocket connection in browser:
   - Open browser DevTools → Network tab → WS filter
   - Navigate to Messages page
   - Check if WebSocket connection is established (status 101)

3. Check for errors in browser console

## Frontend URL Configuration

The frontend is configured in `frontend/src/constants.js`:
- Production URL: `https://django-app-494208442673.europe-west1.run.app`

If the backend URL changes, update this file and rebuild the frontend.

## Cloud Run WebSocket Support

Cloud Run supports WebSockets, but:
- The service must use an ASGI server (daphne) ✅
- The service must handle WebSocket upgrade requests ✅
- CORS and origin validation must be configured ✅

## Troubleshooting

If WebSocket still doesn't work:

1. **Check backend is using daphne**:
   ```bash
   gcloud run services logs read django-app --region=europe-west1 | grep -i daphne
   ```

2. **Check WebSocket endpoint is accessible**:
   ```bash
   curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Origin: https://react-frontend-gkihzbtmca-ew.a.run.app" \
     https://django-app-494208442673.europe-west1.run.app/ws/chat/test/
   ```

3. **Check browser console for errors**:
   - Look for WebSocket connection errors
   - Check if Origin header is being sent correctly

4. **Verify ALLOWED_HOSTS includes frontend domain**:
   - The frontend domain must be in `ALLOWED_HOSTS` for origin validation

5. **Check CORS settings**:
   - Frontend URL must be in `CORS_ALLOWED_ORIGINS`

## Next Steps

1. ✅ Backend deployed with daphne
2. ✅ ALLOWED_HOSTS updated
3. ✅ CORS settings updated
4. ⚠️ Test WebSocket connection in production
5. ⚠️ If frontend URL changes, update `constants.js` and redeploy frontend

