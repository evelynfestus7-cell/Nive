function showAchievement(title){

    const toast =
    document.createElement("div");

    toast.className =
        "achievement-toast";

    toast.innerHTML =
        `
        <strong>
        Achievement Unlocked
        </strong><br>
        ${title}
        `;

    document.body.appendChild(
        toast
    );

    setTimeout(
        ()=>{
            toast.classList.add(
                "show"
            );
        },
        100
    );

    setTimeout(
        ()=>{
            toast.remove();
        },
        3500
    );

}