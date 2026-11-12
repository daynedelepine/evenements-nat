import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Projet de TEST en local (localhost), production sinon. Ces clés sont publiques : les règles Firebase font foi.
const CONFIGS = {
  prod: {
    apiKey: 'AIzaSyCV4Zx7vfR0Et4uDWlYsmPxUptQnRMPCes',
    authDomain: 'evenements-nat.firebaseapp.com',
    databaseURL: 'https://evenements-nat-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'evenements-nat',
    storageBucket: 'evenements-nat.firebasestorage.app',
    messagingSenderId: '283381369320',
    appId: '1:283381369320:web:c106273508efef48503c5d'
  },
  test: {
    apiKey: 'AIzaSyDVZ3XM0W6q8TbSCK9GUWTeE9gHevNFMe0',
    authDomain: 'evenements-nat-test.firebaseapp.com',
    databaseURL: 'https://evenements-nat-test-default-rtdb.firebaseio.com',
    projectId: 'evenements-nat-test',
    storageBucket: 'evenements-nat-test.firebasestorage.app',
    messagingSenderId: '193804076960',
    appId: '1:193804076960:web:0a6e5bc00728c6aff006c5'
  }
};
export const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const app = initializeApp(isLocal ? CONFIGS.test : CONFIGS.prod);
export const db = getDatabase(app);
export const getAuthInstance = () => getAuth(app);

// Compte administrateur (identifiant public ; les règles de la base font foi)
const ADMIN_UIDS = { prod: 'hSfCSlm2tdSnc6WMARMheQP7NpY2', test: 'DHxXDMMYv7hWHt259q3lAWzvIQb2' };
export const ADMIN_UID = isLocal ? ADMIN_UIDS.test : ADMIN_UIDS.prod;
