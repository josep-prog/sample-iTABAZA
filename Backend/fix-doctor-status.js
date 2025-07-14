const { supabase } = require("./config/db");

async function fixDoctorStatus() {
    console.log("🔧 Fixing doctor status...\n");
    
    try {
        // First, let's see what doctors we have
        const { data: doctors, error: fetchError } = await supabase
            .from('doctors')
            .select('*');
        
        if (fetchError) {
            console.error("❌ Error fetching doctors:", fetchError);
            return;
        }
        
        console.log(`Found ${doctors.length} doctors in database:`);
        doctors.forEach(doctor => {
            console.log(`- ${doctor.doctor_name} (Status: ${doctor.status}, Available: ${doctor.is_available})`);
        });
        
        // Update all doctors to be approved and available
        const { data: updatedDoctors, error: updateError } = await supabase
            .from('doctors')
            .update({ 
                status: true, 
                is_available: true 
            })
            .eq('status', false)
            .select();
        
        if (updateError) {
            console.error("❌ Error updating doctors:", updateError);
            return;
        }
        
        console.log(`\n✅ Updated ${updatedDoctors.length} doctors to be approved and available`);
        
        // Verify the update
        const { data: verifiedDoctors, error: verifyError } = await supabase
            .from('doctors')
            .select('*');
        
        if (verifyError) {
            console.error("❌ Error verifying update:", verifyError);
            return;
        }
        
        console.log("\n📊 Updated Status Distribution:");
        const approved = verifiedDoctors.filter(d => d.status === true).length;
        const available = verifiedDoctors.filter(d => d.is_available === true).length;
        const approvedAndAvailable = verifiedDoctors.filter(d => d.status === true && d.is_available === true).length;
        
        console.log(`   Total doctors: ${verifiedDoctors.length}`);
        console.log(`   Approved (status=true): ${approved}`);
        console.log(`   Available (is_available=true): ${available}`);
        console.log(`   Approved & Available: ${approvedAndAvailable}`);
        
        if (approvedAndAvailable > 0) {
            console.log("\n🎉 Doctors are now available for booking!");
        }
        
    } catch (error) {
        console.error("❌ Error fixing doctor status:", error);
    }
}

// Run the fix
fixDoctorStatus(); 