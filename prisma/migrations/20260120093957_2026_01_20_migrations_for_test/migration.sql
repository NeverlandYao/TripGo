-- CreateTable
CREATE TABLE "VehicleType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "luggageSmall" INTEGER NOT NULL,
    "luggageMedium" INTEGER NOT NULL,
    "luggageLarge" INTEGER NOT NULL,
    "isLuxury" BOOLEAN NOT NULL DEFAULT false,
    "isBus" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "fromArea" TEXT NOT NULL,
    "toArea" TEXT NOT NULL,
    "tripType" TEXT NOT NULL,
    "basePriceJpy" INTEGER NOT NULL,
    "nightFeeJpy" INTEGER NOT NULL DEFAULT 0,
    "urgentFeeJpy" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vehicleTypeId" TEXT NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'JPY',
    "tripType" TEXT NOT NULL,
    "pickupTime" TIMESTAMP(3) NOT NULL,
    "pickupLocation" TEXT NOT NULL,
    "dropoffLocation" TEXT NOT NULL,
    "flightNumber" TEXT,
    "flightDate" TIMESTAMP(3),
    "flightNote" TEXT,
    "passengers" INTEGER NOT NULL,
    "childSeats" INTEGER NOT NULL DEFAULT 0,
    "luggageSmall" INTEGER NOT NULL DEFAULT 0,
    "luggageMedium" INTEGER NOT NULL DEFAULT 0,
    "luggageLarge" INTEGER NOT NULL DEFAULT 0,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactNote" TEXT,
    "pricingBaseJpy" INTEGER NOT NULL,
    "pricingNightJpy" INTEGER NOT NULL DEFAULT 0,
    "pricingUrgentJpy" INTEGER NOT NULL DEFAULT 0,
    "pricingChildSeatJpy" INTEGER NOT NULL DEFAULT 0,
    "pricingManualAdjustmentJpy" INTEGER NOT NULL DEFAULT 0,
    "pricingTotalJpy" INTEGER NOT NULL,
    "pricingNote" TEXT,
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "vehicleTypeId" TEXT NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricingRule_fromArea_toArea_tripType_vehicleTypeId_idx" ON "PricingRule"("fromArea", "toArea", "tripType", "vehicleTypeId");

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_vehicleTypeId_fkey" FOREIGN KEY ("vehicleTypeId") REFERENCES "VehicleType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
