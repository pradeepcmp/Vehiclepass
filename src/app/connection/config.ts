import { config } from 'dotenv';

config();

const PARKING_CONNECT = process.env.NEXT_PUBLIC_API_URL;

export default PARKING_CONNECT;
