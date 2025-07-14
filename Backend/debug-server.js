const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

console.log("Starting server debug...");

try {
    console.log("1. Loading user router...");
    const { userRouter } = require("./routers/user.router");
    console.log("✅ User router loaded successfully");
    
    console.log("2. Loading doctor router...");
    const { doctorRouter } = require("./routers/doctor.router");
    console.log("✅ Doctor router loaded successfully");
    
    console.log("3. Loading department router...");
    const { departmentRouter } = require("./routers/department.router");
    console.log("✅ Department router loaded successfully");
    
    console.log("4. Loading appointment router...");
    const { appointmentRouter } = require("./routers/appointment.router");
    console.log("✅ Appointment router loaded successfully");
    
    console.log("5. Loading enhanced appointment router...");
    const { enhancedAppointmentRouter } = require("./routers/enhanced-appointment.router");
    console.log("✅ Enhanced appointment router loaded successfully");
    
    console.log("6. Loading dashboard router...");
    const { dashboardRouter } = require("./routers/adminDash.router");
    console.log("✅ Dashboard router loaded successfully");
    
    console.log("7. Registering routes...");
    app.use("/user", userRouter);
    console.log("✅ User routes registered");
    
    app.use("/department", departmentRouter);
    console.log("✅ Department routes registered");
    
    app.use("/doctor", doctorRouter);
    console.log("✅ Doctor routes registered");
    
    app.use("/appointment", appointmentRouter);
    console.log("✅ Appointment routes registered");
    
    app.use("/enhanced-appointment", enhancedAppointmentRouter);
    console.log("✅ Enhanced appointment routes registered");
    
    app.use("/admin", dashboardRouter);
    console.log("✅ Admin routes registered");
    
    console.log("8. Testing doctor route registration...");
    const routes = [];
    app._router.stack.forEach(middleware => {
        if (middleware.route) {
            routes.push(`${middleware.route.stack[0].method.toUpperCase()} ${middleware.route.path}`);
        } else if (middleware.name === 'router') {
            middleware.handle.stack.forEach(handler => {
                if (handler.route) {
                    routes.push(`${handler.route.stack[0].method.toUpperCase()} ${middleware.regexp.source}${handler.route.path}`);
                }
            });
        }
    });
    
    console.log("Registered routes:");
    routes.forEach(route => console.log(`  - ${route}`));
    
    console.log("9. Starting server...");
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        console.log(`✅ Server started successfully on port ${PORT}`);
        console.log("🎉 All systems operational!");
    });
    
} catch (error) {
    console.error("❌ Error during server startup:", error);
    process.exit(1);
} 