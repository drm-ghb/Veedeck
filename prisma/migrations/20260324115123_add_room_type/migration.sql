-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('TOALETA', 'WC', 'SALON', 'KUCHNIA', 'SYPIALNIA', 'INNE');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "type" "RoomType" NOT NULL DEFAULT 'INNE';
