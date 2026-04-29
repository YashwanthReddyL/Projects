async function submitForm() {
    const fileInput = document.getElementById("resumeFile");
    const jobDesc = document.getElementById("jobDesc").value;

    if (!fileInput.files[0]) {
        alert("Please upload a resume");
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);
    formData.append("job_description", jobDesc);

    const response = await fetch("http://127.0.0.1:8000/match", {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    displayResults(data);
}

function displayResults(data) {
    document.getElementById("results").style.display = "block";

    document.getElementById("name").innerText = data.resume.name || "Unknown";
    document.getElementById("email").innerText = data.resume.email || "No Email";
    document.getElementById("score").innerText = data.match_result.final_score;

    // Matched skills
    const matchedList = document.getElementById("matched");
    matchedList.innerHTML = "";
    data.match_result.matched_skills.forEach(skill => {
        const li = document.createElement("li");
        li.innerText = "✔ " + skill;
        li.style.color = "green";
        matchedList.appendChild(li);
    });

    // Missing skills
    const missingList = document.getElementById("missing");
    missingList.innerHTML = "";
    data.match_result.missing_skills.forEach(skill => {
        const li = document.createElement("li");
        li.innerText = "✘ " + skill;
        li.style.color = "red";
        missingList.appendChild(li);
    });
}