/* homepage-animation.js */

document.addEventListener('DOMContentLoaded', () => {

    // --- SCENE MANAGER (AUTO ONLY) ---
    const scenes = [
        document.getElementById('scene1'),
        document.getElementById('scene2'),
        document.getElementById('scene3')
    ];

    let currentSceneIdx = 0;

    function switchScene(index) {
        // Hide all
        scenes.forEach(s => s.classList.remove('active'));

        // Show target
        scenes[index].classList.add('active');
        currentSceneIdx = index;
    }

    function startAutoRotate() {
        setInterval(() => {
            let next = (currentSceneIdx + 1) % scenes.length;
            switchScene(next);
        }, 4000); // Faster 4 Seconds Cycle
    }

    // Start Logic
    switchScene(0);
    startAutoRotate();

    // --- SPECIFIC ANIMATION LOGIC (Data Simulation) ---

    // CPO Temp Fluctuation
    const tempEl = document.getElementById('cpo-temp');
    function updateTemp() {
        const base = 24.0;
        const diff = (Math.random() * 0.7) - 0.2;
        if (tempEl) tempEl.innerText = (base + diff).toFixed(1) + "°C";
    }
    if (tempEl) setInterval(updateTemp, 2000);


    // Navigation Links (Equipment Status)
    const btnEquip = document.querySelector('.btn-cta-secondary');
    if (btnEquip) {
        btnEquip.addEventListener('click', () => {
            alert("Equipment Status Module: Coming Soon");
        });
    }

});
