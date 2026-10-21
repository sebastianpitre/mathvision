const characters =
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 5) {
  let code = "";

  for (let i = 0; i < length; i++) {
    const index = Math.floor(
      Math.random() * characters.length
    );

    code += characters[index];
  }

  return code;
}