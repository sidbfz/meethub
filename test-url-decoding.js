// Test URL decoding fix for image deletion
// This demonstrates the fix we applied to the deleteEvent function

// Example problematic URL from Supabase storage
const supabaseImageUrl = "https://qhcxtucacgdksrlrbsmj.supabase.co/storage/v1/object/public/events/public/student%20id%20(1).jpg";

// Old method (broken) - would try to delete wrong file path
function extractFilePathOld(url) {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    return fileName; // Returns: "student%20id%20(1).jpg"
}

// New method (fixed) - properly decodes URL-encoded characters
function extractFilePathNew(url) {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    return decodeURIComponent(fileName); // Returns: "student id (1).jpg"
}

console.log("=== URL Decoding Fix Test ===");
console.log("Original URL:", supabaseImageUrl);
console.log("");
console.log("Old method (broken):", extractFilePathOld(supabaseImageUrl));
console.log("New method (fixed):", extractFilePathNew(supabaseImageUrl));
console.log("");
console.log("The fix ensures we delete the correct file from Supabase storage!");

// Test with various problematic filenames
const testUrls = [
    "https://example.com/events/public/student%20id%20(1).jpg",
    "https://example.com/events/public/my%20event%20photo.png", 
    "https://example.com/events/public/test%26file.jpg",
    "https://example.com/events/public/caf%C3%A9%20meeting.jpg"
];

console.log("\n=== Additional Test Cases ===");
testUrls.forEach(url => {
    console.log(`URL: ${url}`);
    console.log(`Old: ${extractFilePathOld(url)}`);
    console.log(`New: ${extractFilePathNew(url)}`);
    console.log("---");
});
