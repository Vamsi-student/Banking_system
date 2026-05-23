import mongoose from "mongoose";

export async function connectdb(){
    await mongoose.connect(process.env.MONGO_URI).then(()=>{
        console.log("Server is connected to DB");
    }).catch(err=>{
        console.log(err);
        process.exit(1);
    })
    }
