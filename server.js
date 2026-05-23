import dns from "dns";
dns.setServers(["8.8.8.8","8.8.8.4"]);
import app from "./src/app.js";
import { connectdb } from "./src/config/db.js";
import { configDotenv } from "dotenv";
configDotenv();
app.listen(3000,()=>{
    console.log("Server is running on port 3000");
})

connectdb();


