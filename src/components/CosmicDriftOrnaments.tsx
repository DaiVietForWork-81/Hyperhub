import React from 'react';
import {
  GeometricAtomSphere,
  GeometricSphere,
  GeometricCube,
  GeometricRectPrism,
  GeometricPyramid,
  GeometricParallelogram,
  GeometricTrapezoid,
  GeometricOctahedron,
} from './Geometric3DItems';

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
      {/* 1. KHỐI HÌNH HỌC 3D NEO VỊ TRÍ (Anchored 3D Shapes)       */}
      {/* ======================================================== */}

      {/* Góc Trên Phải: Khối Lập Phương 3D Kính Neon (3D Cube) */}
      <div className="pointer-events-auto absolute top-20 right-4 sm:right-12 lg:right-24 hover:opacity-100 transition-opacity">
        <GeometricCube
          size={52}
          theme="purple"
          isFloating={true}
        />
      </div>

      {/* Góc Trên Trái: Khối Cầu Nguyên Tử Lượng Tử (Atomic Sphere) */}
      <div className="pointer-events-auto hidden sm:block absolute top-28 left-4 sm:left-10 lg:left-20 hover:opacity-100 transition-opacity">
        <GeometricAtomSphere
          size={56}
          theme="cyan"
          isFloating={true}
        />
      </div>

      {/* Góc Giữa Trái: Khối Bát Diện 3D (Octahedron) */}
      <div className="pointer-events-auto hidden md:block absolute top-[650px] left-6 lg:left-14 opacity-85 hover:opacity-100 transition-opacity">
        <GeometricOctahedron
          size={50}
          theme="pink"
          isFloating={true}
        />
      </div>

      {/* Góc Giữa Phải: Khối Tam Giác Kim Tự Tháp 3D (Pyramid) */}
      <div className="pointer-events-auto hidden sm:block absolute top-[750px] right-6 lg:right-16 opacity-85 hover:opacity-100 transition-opacity">
        <GeometricPyramid
          size={52}
          theme="amber"
          isFloating={true}
        />
      </div>

      {/* Đoạn Thân: Khối Hình Bình Hành 3D (Parallelogram) */}
      <div className="pointer-events-auto hidden lg:block absolute top-[1400px] right-12 opacity-80 hover:opacity-100 transition-opacity">
        <GeometricParallelogram
          size={50}
          theme="emerald"
          isFloating={true}
        />
      </div>

      {/* Đoạn Thân Trái: Khối Hình Thang 3D (Trapezoid) */}
      <div className="pointer-events-auto hidden md:block absolute top-[1500px] left-12 opacity-80 hover:opacity-100 transition-opacity">
        <GeometricTrapezoid
          size={52}
          theme="cyan"
          isFloating={true}
        />
      </div>

      {/* ======================================================== */}
      {/* 2. CÁC KHỐI HÌNH HỌC 3D DI CHUYỂN TUẦN TRA QUANH WEB      */}
      {/* ======================================================== */}

      {/* Khối di chuyển 1: Khối Hộp Chữ Nhật 3D tuần tra ngang dọc */}
      <div className="pointer-events-auto absolute top-[350px] left-[15%] hidden md:block">
        <div className="animate-wander-1">
          <GeometricRectPrism
            size={48}
            theme="cyan"
            isFloating={false}
          />
        </div>
      </div>

      {/* Khối di chuyển 2: Khối Cầu 3D mượt mà bay lượn quanh web */}
      <div className="pointer-events-auto absolute top-[220px] left-[55%]">
        <div className="animate-wander-2">
          <GeometricSphere
            size={42}
            theme="pink"
            isFloating={false}
          />
        </div>
      </div>

      {/* Khối di chuyển 3: Khối Bát Diện 3D bay quanh quỹ đạo rộng */}
      <div className="pointer-events-auto absolute top-[950px] right-[20%] hidden sm:block">
        <div className="animate-wander-orbit">
          <GeometricOctahedron
            size={46}
            theme="purple"
            isFloating={false}
          />
        </div>
      </div>

      {/* Khối di chuyển 4: Khối Tam Giác Kim Tự Tháp 3D di chuyển đường chéo */}
      <div className="pointer-events-auto absolute top-[1150px] left-[25%] hidden lg:block">
        <div className="animate-wander-diagonal">
          <GeometricPyramid
            size={46}
            theme="amber"
            isFloating={false}
          />
        </div>
      </div>

      {/* Khối di chuyển 5: Cầu Nguyên Tử 3D lướt ngang trang trọng */}
      <div className="pointer-events-auto absolute top-[520px] right-[12%] hidden sm:block">
        <div className="animate-wander-sweep">
          <GeometricAtomSphere
            size={50}
            theme="emerald"
            isFloating={false}
          />
        </div>
      </div>

      {/* Khối di chuyển 6: Khối Lập Phương 3D tuần tra phía dưới */}
      <div className="pointer-events-auto absolute top-[1750px] right-[35%] hidden sm:block">
        <div className="animate-wander-1">
          <GeometricCube
            size={44}
            theme="purple"
            isFloating={false}
          />
        </div>
      </div>

      {/* Khối di chuyển 7: Khối Hình Thang 3D bay quanh quỹ đạo elip */}
      <div className="pointer-events-auto absolute top-[1950px] left-[18%] hidden md:block">
        <div className="animate-wander-orbit">
          <GeometricTrapezoid
            size={46}
            theme="cyan"
            isFloating={false}
          />
        </div>
      </div>
    </div>
  );
};

export default CosmicDriftOrnaments;
