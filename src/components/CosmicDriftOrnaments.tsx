import React from 'react';
import { QuantumCore } from './QuantumCore';
import {
  MinecraftBlock,
  MinecraftEnchantedBook,
  MinecraftXpOrb,
  Geometric3D,
} from './MinecraftVoxelItems';

interface CosmicDriftOrnamentsProps {
  className?: string;
}

export const CosmicDriftOrnaments: React.FC<CosmicDriftOrnamentsProps> = ({
  className = '',
}) => {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full z-0 overflow-hidden select-none opacity-80 dark:opacity-95 transition-opacity duration-300 ${className}`}
      style={{
        contain: 'paint layout',
        willChange: 'transform',
      }}
    >
      {/* ======================================================== */}
      {/* 1. KHỐI ĐỨNG YÊN CHỖ (Anchored Minecraft & 3D Shapes)       */}
      {/* ======================================================== */}

      {/* Góc Trên Phải: Khối Kim Cương Minecraft 3D Voxel (Diamond Block) */}
      <div className="pointer-events-auto absolute top-20 right-4 sm:right-12 lg:right-24 hover:opacity-100 transition-opacity">
        <MinecraftBlock
          type="diamond"
          size={52}
          label="DIAMOND"
          isFloating={true}
        />
      </div>

      {/* Góc Trên Trái: Cuốn Sách Phù Phép Tri Thức Minecraft (Enchanted Book) */}
      <div className="pointer-events-auto hidden sm:block absolute top-28 left-4 sm:left-10 lg:left-20 hover:opacity-100 transition-opacity">
        <MinecraftEnchantedBook
          size={54}
          label="ENCHANTED BOOK"
          isFloating={true}
        />
      </div>

      {/* Góc Giữa Trái: Khối Đá Đỏ Minecraft (Redstone Ore) */}
      <div className="pointer-events-auto hidden md:block absolute top-[650px] left-6 lg:left-14 opacity-85 hover:opacity-100 transition-opacity">
        <MinecraftBlock
          type="redstone"
          size={46}
          label="REDSTONE"
          isFloating={true}
        />
      </div>

      {/* Góc Giữa Phải: Khối Bát Diện 3D Lượng Tử (Quantum Octahedron) */}
      <div className="pointer-events-auto hidden sm:block absolute top-[750px] right-6 lg:right-16 opacity-85 hover:opacity-100 transition-opacity">
        <Geometric3D
          shape="octahedron"
          size={50}
          colorTheme="purple"
          isFloating={true}
        />
      </div>

      {/* Đoạn Thân: Khối Ngọc Lục Bảo (Emerald Voxel) */}
      <div className="pointer-events-auto hidden lg:block absolute top-[1400px] right-12 opacity-80 hover:opacity-100 transition-opacity">
        <MinecraftBlock
          type="emerald"
          size={48}
          label="EMERALD"
          isFloating={true}
        />
      </div>

      {/* Đoạn Thân Trái: Con Quay Hồi Chuyển Lượng Tử (Cyan Quantum Core) */}
      <div className="pointer-events-auto hidden md:block absolute top-[1500px] left-12 opacity-80 hover:opacity-100 transition-opacity">
        <QuantumCore
          size={54}
          colorTheme="cyan"
          isFloating={true}
        />
      </div>

      {/* ======================================================== */}
      {/* 2. CÁC ĐỒ VẬT DI CHUYỂN XUNG QUANH WEB (Wandering Patrol) */}
      {/* ======================================================== */}

      {/* Đồ vật di chuyển 1: Khối Vàng Minecraft tuần tra lượn sóng ngang dọc */}
      <div className="pointer-events-auto absolute top-[350px] left-[15%] hidden md:block">
        <div className="animate-wander-1">
          <MinecraftBlock
            type="gold"
            size={42}
            label="GOLD ORE"
            isFloating={false}
          />
        </div>
      </div>

      {/* Đồ vật di chuyển 2: Hạt Kinh Nghiệm Minecraft (XP Orb 1) di chuyển quanh trang web */}
      <div className="pointer-events-auto absolute top-[220px] left-[55%]">
        <div className="animate-wander-2">
          <MinecraftXpOrb size={38} isFloating={false} />
        </div>
      </div>

      {/* Đồ vật di chuyển 3: Khối Bát Diện 3D bay quanh quỹ đạo rộng */}
      <div className="pointer-events-auto absolute top-[950px] right-[20%] hidden sm:block">
        <div className="animate-wander-orbit">
          <Geometric3D
            shape="octahedron"
            size={46}
            colorTheme="cyan"
            isFloating={false}
          />
        </div>
      </div>

      {/* Đồ vật di chuyển 4: Kim Tự Tháp Năng Lượng 3D di chuyển đường chéo */}
      <div className="pointer-events-auto absolute top-[1150px] left-[25%] hidden lg:block">
        <div className="animate-wander-diagonal">
          <Geometric3D
            shape="pyramid"
            size={48}
            colorTheme="amber"
            isFloating={false}
          />
        </div>
      </div>

      {/* Đồ vật di chuyển 5: Cuốn Sách Phù Phép lướt ngang trang trọng */}
      <div className="pointer-events-auto absolute top-[520px] right-[12%] hidden sm:block">
        <div className="animate-wander-sweep">
          <MinecraftEnchantedBook
            size={48}
            isFloating={false}
          />
        </div>
      </div>

      {/* Đồ vật di chuyển 6: Hạt Kinh Nghiệm Minecraft (XP Orb 2) tuần tra phía dưới */}
      <div className="pointer-events-auto absolute top-[1750px] right-[35%] hidden sm:block">
        <div className="animate-wander-1">
          <MinecraftXpOrb size={34} isFloating={false} />
        </div>
      </div>

      {/* Đồ vật di chuyển 7: Lăng Kính Lượng Tử Phản Chiếu (Prism) */}
      <div className="pointer-events-auto absolute top-[1950px] left-[18%] hidden md:block">
        <div className="animate-wander-orbit">
          <Geometric3D
            shape="prism"
            size={44}
            colorTheme="emerald"
            isFloating={false}
          />
        </div>
      </div>
    </div>
  );
};

export default CosmicDriftOrnaments;
