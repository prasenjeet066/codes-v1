import type React from "react"

export interface VerificationBadgeProps {
  verified?: boolean
  label?: string
  size?: number // px
  className?: string
}

/**
 * VerificationBadge - A badge to indicate verified status, using a custom SVG icon.
 *
 * @param verified - Whether the badge is shown (default: true)
 * @param label - Tooltip text (default: "Verified")
 * @param size - SVG size in px (default: 24)
 * @param className - Additional classes
 */
const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  verified = true,
  label = "Verified",
  size = 24,
  className = "",
}) => {
  if (!verified) return null
  return (
    <span
      className={`inline-flex items-center ${className}`}
      title={label}
      style={{ width: size, height: size }}
      aria-label={label}
      data-testid="verification-badge"
    >
      <svg
        width={size}
        height={size}
        viewBox="-2.4 -2.4 28.80 28.80"
        fill="#3D00FF"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g>
          <path
            d="M11.5283 1.5999C11.7686 1.29437 12.2314 1.29437 12.4717 1.5999L14.2805 3.90051C14.4309 4.09173 14.6818 4.17325 14.9158 4.10693L17.7314 3.3089C18.1054 3.20292 18.4799 3.475 18.4946 3.86338L18.6057 6.78783C18.615 7.03089 18.77 7.24433 18.9984 7.32823L21.7453 8.33761C22.1101 8.47166 22.2532 8.91189 22.0368 9.23478L20.4078 11.666C20.2724 11.8681 20.2724 12.1319 20.4078 12.334L22.0368 14.7652C22.2532 15.0881 22.1101 15.5283 21.7453 15.6624L18.9984 16.6718C18.77 16.7557 18.615 16.9691 18.6057 17.2122L18.4946 20.1366C18.4799 20.525 18.1054 20.7971 17.7314 20.6911L14.9158 19.8931C14.6818 19.8267 14.4309 19.9083 14.2805 20.0995L12.4717 22.4001C12.2314 22.7056 11.7686 22.7056 11.5283 22.4001L9.71949 20.0995C9.56915 19.9083 9.31823 19.8267 9.08421 19.8931L6.26856 20.6911C5.89463 20.7971 5.52014 20.525 5.50539 20.1366L5.39427 17.2122C5.38503 16.9691 5.22996 16.7557 5.00164 16.6718L2.25467 15.6624C1.88986 15.5283 1.74682 15.0881 1.96317 14.7652L3.59221 12.334C3.72761 12.1319 3.72761 11.8681 3.59221 11.666L1.96317 9.23478C1.74682 8.91189 1.88986 8.47166 2.25467 8.33761L5.00165 7.32823C5.22996 7.24433 5.38503 7.03089 5.39427 6.78783L5.50539 3.86338C5.52014 3.475 5.89463 3.20292 6.26857 3.3089L9.08421 4.10693C9.31823 4.17325 9.56915 4.09173 9.71949 3.90051L11.5283 1.5999Z"
            stroke="none"
            strokeWidth="0.936"
          />
          <path d="M9 12L11 14L15 10" stroke="white" strokeWidth="0.936" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </span>
  )
}

export { VerificationBadge }
export default VerificationBadge
