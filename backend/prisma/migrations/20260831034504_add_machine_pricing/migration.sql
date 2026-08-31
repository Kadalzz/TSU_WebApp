-- CreateTable
CREATE TABLE "machine_upload_history" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "uploaded_by" INTEGER NOT NULL,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL,
    "total_records" INTEGER NOT NULL,
    "success_count" INTEGER NOT NULL,
    "failed_count" INTEGER NOT NULL,
    "error_log" JSONB,
    "is_active_version" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machine_upload_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machine_master" (
    "id" SERIAL NOT NULL,
    "material_number" TEXT NOT NULL,
    "description" TEXT,
    "cogs" DECIMAL(14,2),
    "price" DECIMAL(14,2) NOT NULL,
    "upload_version_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machine_master_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "machine_master_material_number_idx" ON "machine_master"("material_number");

-- CreateIndex
CREATE INDEX "machine_master_upload_version_id_idx" ON "machine_master"("upload_version_id");

-- AddForeignKey
ALTER TABLE "machine_upload_history" ADD CONSTRAINT "machine_upload_history_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machine_master" ADD CONSTRAINT "machine_master_upload_version_id_fkey" FOREIGN KEY ("upload_version_id") REFERENCES "machine_upload_history"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
