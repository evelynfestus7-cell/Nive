function updateLevel(user){

    const level =
        Math.floor(
            user.xp / 100
        ) + 1;

    user.level = level;

    saveUser(user);

}